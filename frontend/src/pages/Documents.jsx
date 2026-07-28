import { useState, useEffect, useRef } from "react";
import { 
  collection, addDoc, deleteDoc, doc, query, getDocs, 
  Timestamp, where 
} from "firebase/firestore";
import { db } from "../firebase"; 
import { useAuth } from "../context/AuthContext";
import "./Documents.css";

// ✅ CLOUDINARY CONFIGURATION
const CLOUDINARY_CLOUD_NAME = "glqxyhhr"; 
const CLOUDINARY_UPLOAD_PRESET = "logistics-uploads"; 

const LOGISTICS_CATEGORIES = [
  { value: "LOI", label: "Letter of Intent (LOI)", icon: "📋" },
  { value: "SPA", label: "Sales & Purchase Agreement", icon: "📝" },
  { value: "BillOfLading", label: "Bill of Lading", icon: "🚢" },
  { value: "CommercialInvoice", label: "Commercial Invoice", icon: "💰" },
  { value: "PackingList", label: "Packing List", icon: "📦" },
  { value: "Insurance", label: "Insurance Certificate", icon: "🛡️" },
  { value: "Customs", label: "Customs Declaration", icon: "🛃" },
  { value: "DeliveryNote", label: "Delivery Note", icon: "📬" },
  { value: "Contract", label: "Contract/Agreement", icon: "📑" },
  { value: "Invoice", label: "Invoice", icon: "🧾" },
  { value: "Certificate", label: "Certificate", icon: "📜" },
  { value: "Other", label: "Other Document", icon: "" }
];

export default function Documents() {
  const { currentUser } = useAuth();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [toast, setToast] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Other");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const fileInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!currentUser?.uid) return;
      
      try {
        setLoading(true);
        const q = query(
          collection(db, "documents"),
          where("userId", "==", currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        
        const docsList = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            uploadedAt: data.uploadedAt instanceof Timestamp 
              ? data.uploadedAt.toDate() 
              : new Date()
          };
        });
        
        const sortedDocs = docsList.sort((a, b) => {
          const dateA = a.uploadedAt || new Date(0);
          const dateB = b.uploadedAt || new Date(0);
          return dateB - dateA;
        });
        
        setDocuments(sortedDocs);
      } catch (error) {
        console.error("Error fetching documents:", error);
        showToast(`Failed to load: ${error.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [currentUser]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!currentUser?.uid) {
      showToast("Please login to upload", 'error');
      return;
    }

    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast(`File too large! Max 20MB allowed.`, 'error');
      return;
    }

    const allowedTypes = [
      'application/pdf', 
      'image/jpeg', 'image/png', 'image/jpg',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|txt|doc|docx|xls|xlsx)$/i)) {
      showToast("Unsupported file type!", 'error');
      return;
    }

    setPendingFile(file);
    setShowCategoryModal(true);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ✅ FIXED: Cloudinary Upload Function with correct resource types
  const handleUploadWithCategory = async () => {
    if (!pendingFile) return;

    setShowCategoryModal(false);
    setUploading(true);
    setUploadProgress(10); 

    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'atirath-documents'); 

      // ✅ FIX: Determine if it's an image or a raw file (PDF, Word, etc.)
      const isImage = pendingFile.type.startsWith('image/');
      const resourceType = isImage ? 'image' : 'raw';
      
      // Create the correct URL based on file type
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Cloudinary upload failed");
      }

      setUploadProgress(90);
      const cloudinaryData = await response.json();
      const downloadURL = cloudinaryData.secure_url; 

      setUploadProgress(100);

      const docData = {
        name: pendingFile.name,
        fileName: cloudinaryData.public_id,
        type: getFileType(pendingFile),
        size: formatFileSize(pendingFile.size),
        sizeBytes: pendingFile.size,
        category: selectedCategory,
        categoryLabel: LOGISTICS_CATEGORIES.find(c => c.value === selectedCategory)?.label || selectedCategory,
        downloadURL: downloadURL,
        storagePath: cloudinaryData.public_id, 
        mimeType: pendingFile.type,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        uploadedBy: currentUser.displayName || currentUser.email?.split('@')[0],
        uploadedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, "documents"), docData);
      
      const newDoc = {
        id: docRef.id,
        ...docData,
        uploadedAt: new Date()
      };
      setDocuments(prev => [newDoc, ...prev]);

      showToast(`"${pendingFile.name}" uploaded successfully!`, 'success');

      setPendingFile(null);
      setSelectedCategory("Other");
      setUploadProgress(0);
      
    } catch (error) {
      console.error("Upload error:", error);
      showToast(`Upload failed: ${error.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docItem) => {
    if (!window.confirm(`Delete "${docItem.name}"?`)) return;

    try {
      await deleteDoc(doc(db, "documents", docItem.id));
      
      setDocuments(prev => prev.filter(d => d.id !== docItem.id));
      showToast("Document deleted from app!", 'success');
    } catch (error) {
      console.error("Delete error:", error);
      showToast(`Delete failed: ${error.message}`, 'error');
    }
  };

  const handlePreview = (docItem) => {
    if (!docItem.downloadURL) {
      showToast("No preview available", 'error');
      return;
    }

    if (docItem.type === 'Image') {
      const newWindow = window.open();
      newWindow.document.write(`
        <html>
          <head><title>${docItem.name}</title>
          <style>body{margin:0;background:#1a1a1a;display:flex;justify-content:center;align-items:center;min-height:100vh;}</style>
          </head>
          <body><img src="${docItem.downloadURL}" style="max-width:100%;max-height:100vh;" /></body>
        </html>
      `);
    } else {
      window.open(docItem.downloadURL, '_blank');
    }
  };

  const handleDownload = async (docItem) => {
    if (!docItem.downloadURL) {
      showToast("Download link not available", 'error');
      return;
    }
    
    try {
      // Add attachment flag for Cloudinary to force download
      const downloadLink = docItem.downloadURL.includes('?') 
        ? `${docItem.downloadURL}&fl_attachment=true` 
        : `${docItem.downloadURL}?fl_attachment=true`;

      const response = await fetch(downloadLink);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docItem.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.open(docItem.downloadURL, '_blank');
    }
  };

  const getFileType = (file) => {
    if (file.type.includes('pdf')) return 'PDF';
    if (file.type.includes('image')) return 'Image';
    if (file.type.includes('word') || file.name.match(/\.docx?$/i)) return 'Word';
    if (file.type.includes('excel') || file.type.includes('spreadsheet') || file.name.match(/\.xlsx?$/i)) return 'Excel';
    if (file.type.includes('text')) return 'Text';
    return 'Other';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(docItem => {
    const matchesSearch = docItem.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || docItem.type?.toLowerCase() === filterType;
    const matchesCategory = filterCategory === "all" || docItem.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDocuments = filteredDocuments.slice(startIndex, endIndex);

  const totalFiles = documents.length;
  const pdfCount = documents.filter(d => d.type === "PDF").length;
  const imageCount = documents.filter(d => d.type === "Image").length;
  const totalSize = documents.reduce((sum, d) => sum + (d.sizeBytes || 0), 0);

  if (loading) {
    return (
      <div className="documents-page">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="documents-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-info">
          <h1>📑 Documents</h1>
          <p>Manage logistics documents - LOI, SPA, Bill of Lading, Invoices & more</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon-wrapper green">
            <div className="summary-icon">📄</div>
          </div>
          <div className="summary-details">
            <div className="summary-label">Total Files</div>
            <div className="summary-value">{totalFiles}</div>
            <div className="summary-subtitle">All Documents</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-wrapper blue">
            <div className="summary-icon">PDF</div>
          </div>
          <div className="summary-details">
            <div className="summary-label">PDF Files</div>
            <div className="summary-value">{pdfCount}</div>
            <div className="summary-subtitle">PDF Documents</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-wrapper purple">
            <div className="summary-icon">🖼️</div>
          </div>
          <div className="summary-details">
            <div className="summary-label">Images</div>
            <div className="summary-value">{imageCount}</div>
            <div className="summary-subtitle">Image Files</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-wrapper orange">
            <div className="summary-icon">💾</div>
          </div>
          <div className="summary-details">
            <div className="summary-label">Total Size</div>
            <div className="summary-value">{formatFileSize(totalSize)}</div>
            <div className="summary-subtitle">Storage Used</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="documents-toolbar">
        <div className="search-box">
          <span className="search-icon"></span>
          <input 
            type="text" 
            placeholder="Search documents..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filterType === "all" ? "active" : ""}`} 
            onClick={() => setFilterType("all")}
          >
            All ({totalFiles})
          </button>
          <button 
            className={`filter-tab ${filterType === "pdf" ? "active" : ""}`} 
            onClick={() => setFilterType("pdf")}
          >
            PDF ({pdfCount})
          </button>
          <button 
            className={`filter-tab ${filterType === "image" ? "active" : ""}`} 
            onClick={() => setFilterType("image")}
          >
            Images ({imageCount})
          </button>
          <button 
            className={`filter-tab ${filterType === "word" ? "active" : ""}`} 
            onClick={() => setFilterType("word")}
          >
            Word ({documents.filter(d => d.type === "Word").length})
          </button>
          <button 
            className={`filter-tab ${filterType === "excel" ? "active" : ""}`} 
            onClick={() => setFilterType("excel")}
          >
            Excel ({documents.filter(d => d.type === "Excel").length})
          </button>
        </div>

        <select 
          className="category-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {LOGISTICS_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>

        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx,.xls,.xlsx"
          onChange={handleFileSelect}
        />
        <button 
          className="upload-document-btn" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <span>⬆</span> Upload Document
        </button>
      </div>

      {/* Upload Info Banner */}
      <div className="upload-info-banner">
        <span className="info-icon">ℹ️</span>
        <div className="info-text">
          <strong>Upload Limits:</strong> Max file size 20MB. Supported: PDF, JPG, PNG, Word, Excel, TXT. Perfect for LOI, SPA, Bill of Lading, Invoices & all logistics documents.
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="upload-progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <p className="progress-text">Uploading: {uploadProgress}% - {pendingFile?.name}</p>
        </div>
      )}

      {/* Category Selection Modal */}
      {showCategoryModal && pendingFile && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="category-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Select Document Category</h2>
              <button className="close-modal" onClick={() => setShowCategoryModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="file-info">
                <span className="file-icon">
                  {getFileType(pendingFile) === 'PDF' ? '📄' : 
                   getFileType(pendingFile) === 'Image' ? '🖼️' : '📁'}
                </span>
                <div>
                  <p className="file-name">{pendingFile.name}</p>
                  <p className="file-size">{formatFileSize(pendingFile.size)}</p>
                </div>
              </div>

              <p className="modal-instruction">Choose the category for this document:</p>

              <div className="category-grid">
                {LOGISTICS_CATEGORIES.map(cat => (
                  <label 
                    key={cat.value}
                    className={`category-option ${selectedCategory === cat.value ? 'active' : ''}`}
                  >
                    <input 
                      type="radio" 
                      name="category"
                      value={cat.value}
                      checked={selectedCategory === cat.value}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    />
                    <span className="category-icon">{cat.icon}</span>
                    <span className="category-name">{cat.label}</span>
                  </label>
                ))}
              </div>

              <button className="upload-confirm-btn" onClick={handleUploadWithCategory}>
                Upload as {LOGISTICS_CATEGORIES.find(c => c.value === selectedCategory)?.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      <div className="documents-grid">
        {currentDocuments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <h3>No Documents Found</h3>
            <p>{searchQuery ? "Try adjusting your search" : "Upload your first logistics document!"}</p>
          </div>
        ) : (
          currentDocuments.map((docItem) => {
            const categoryInfo = LOGISTICS_CATEGORIES.find(c => c.value === docItem.category) || 
                                LOGISTICS_CATEGORIES.find(c => c.value === 'Other');
            
            return (
              <div key={docItem.id} className="document-card">
                <div className="card-header">
                  <div className="icon-section">
                    <div className={`file-type-icon ${docItem.type.toLowerCase()}`}>
                      {docItem.type === 'PDF' ? '📄' : 
                       docItem.type === 'Image' ? '🖼️' : 
                       docItem.type === 'Word' ? '📝' : 
                       docItem.type === 'Excel' ? '' : '📁'}
                    </div>
                    <div className="type-badges">
                      <span className={`type-badge ${docItem.type.toLowerCase()}`}>{docItem.type}</span>
                      <span className="category-badge">{categoryInfo?.label || docItem.category}</span>
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <h3 className="document-title">{docItem.name}</h3>
                  <div className="document-meta">
                    <div className="meta-item">
                      <span className="meta-icon">📦</span>
                      <span>{docItem.size}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">📅</span>
                      <span>
                        {docItem.uploadedAt?.toLocaleDateString("en-IN", { 
                          day: 'numeric', month: 'short', year: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon"></span>
                      <span>{docItem.uploadedBy || 'Admin User'}</span>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  {(docItem.type === 'PDF' || docItem.type === 'Image') && (
                    <button className="action-btn view" onClick={() => handlePreview(docItem)}>
                      <span>👁</span> View
                    </button>
                  )}
                  <button className="action-btn download" onClick={() => handleDownload(docItem)}>
                    <span>⬇</span> Download
                  </button>
                  <button className="action-btn delete" onClick={() => handleDelete(docItem)}>
                    <span>🗑</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-wrapper">
          <div className="pagination-info">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredDocuments.length)} of {filteredDocuments.length} documents
          </div>
          <div className="pagination">
            <button 
              className="page-btn" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`page-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button 
              className="page-btn" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
          </div>
          <div className="per-page">
            <span>Show</span>
            <select value={itemsPerPage} onChange={(e) => {setCurrentPage(1);}}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>per page</span>
          </div>
        </div>
      )}

      {/* Support Banner */}
      <div className="support-banner">
        <div className="banner-content">
          <div className="banner-icon">💼</div>
          <div>
            <h3>Have questions about your documents?</h3>
            <p>Contact our support team for any queries related to document management.</p>
          </div>
        </div>
        <button className="contact-support-banner-btn">Contact Support →</button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div 
          className="toast-notification"
          style={{
            position: 'fixed', top: '20px', right: '20px',
            background: toast.type === 'success' 
              ? 'linear-gradient(135deg, #10b981, #059669)' 
              : 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: 'white', padding: '16px 24px', borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)', zIndex: 10000,
            fontWeight: 600, whiteSpace: 'pre-line', maxWidth: '400px',
            animation: 'slideIn 0.3s ease'
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}