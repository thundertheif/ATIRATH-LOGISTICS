import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./BulkUpload.css";
import logo from "../assets/logo_3.png";

export default function BulkUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("csv");
  
  // Upload State
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [previewData, setPreviewData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  
  // Processing State
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [errors, setErrors] = useState([]);
  const [successCount, setSuccessCount] = useState(0);
  const [editableRow, setEditableRow] = useState(null);
  
  // Settings
  const [serviceType, setServiceType] = useState("standard");
  const [senderPincode, setSenderPincode] = useState("");
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  
  // Manual Entry State
  const [manualEntries, setManualEntries] = useState([{ id: Date.now() }]);
  const [pasteData, setPasteData] = useState("");
  const [isSheetsConnected, setIsSheetsConnected] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [recentUploads, setRecentUploads] = useState([]);
  
  // ✅ INDIAN LOGISTICS DATABASE
  const INDIAN_LOGISTICS = useMemo(() => ({
    cities: {
      "mumbai": { state: "Maharashtra", pinPrefixes: ["400", "401", "410", "411"], aliases: ["bombay", "bom"] },
      "pune": { state: "Maharashtra", pinPrefixes: ["411", "412", "413"] },
      "bangalore": { state: "Karnataka", pinPrefixes: ["560"], aliases: ["bengaluru", "blr"] },
      "delhi": { state: "Delhi", pinPrefixes: ["110"], aliases: ["new delhi", "ndl"] },
      "gurgaon": { state: "Haryana", pinPrefixes: ["122"], aliases: ["gurugram"] },
      "kolkata": { state: "West Bengal", pinPrefixes: ["700"], aliases: ["calcutta"] },
      "chennai": { state: "Tamil Nadu", pinPrefixes: ["600"], aliases: ["madras"] },
      "hyderabad": { state: "Telangana", pinPrefixes: ["500"] },
      "ahmedabad": { state: "Gujarat", pinPrefixes: ["380"] },
      "jaipur": { state: "Rajasthan", pinPrefixes: ["302", "303"] },
      "lucknow": { state: "Uttar Pradesh", pinPrefixes: ["226"] },
      "chandigarh": { state: "Chandigarh", pinPrefixes: ["160"] },
      "mohali": { state: "Punjab", pinPrefixes: ["140"] },
      "noida": { state: "Uttar Pradesh", pinPrefixes: ["201"] },
      "faridabad": { state: "Haryana", pinPrefixes: ["121"] },
      "thane": { state: "Maharashtra", pinPrefixes: ["400", "401"] },
      "navi mumbai": { state: "Maharashtra", pinPrefixes: ["400", "410"] }
    },
    states: {
      "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Navi Mumbai"],
      "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore"],
      "Delhi": ["New Delhi", "Delhi"],
      "Haryana": ["Gurgaon", "Faridabad", "Panipat"],
      "West Bengal": ["Kolkata", "Howrah", "Durgapur"],
      "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
      "Telangana": ["Hyderabad", "Warangal"],
      "Gujarat": ["Ahmedabad", "Surat", "Vadodara"],
      "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur"],
      "Uttar Pradesh": ["Lucknow", "Noida", "Kanpur"],
      "Punjab": ["Mohali", "Ludhiana", "Amritsar"],
      "Chandigarh": ["Chandigarh"]
    }
  }), []);
  
  const REQUIRED_COLUMNS = [
    { 
      key: "trackingId", 
      label: "Tracking ID", 
      required: true, 
      type: "string", 
      validator: (v) => v?.trim().length > 0,
      formatter: (v) => v?.trim().toUpperCase()
    },
    { 
      key: "receiverName", 
      label: "Receiver Name", 
      required: true, 
      type: "string", 
      validator: (v) => v?.trim().length >= 2,
      formatter: (v) => v?.trim().replace(/\s+/g, ' ')
    },
    { 
      key: "receiverPhone", 
      label: "Receiver Phone", 
      required: true, 
      type: "phone", 
      validator: (v) => {
        const cleaned = v?.toString()?.replace(/[\s\-\(\)\.]/g, "");
        return /^(\+91|91)?[6-9][0-9]{9}$/.test(cleaned);
      },
      formatter: (v) => {
        const cleaned = v?.toString()?.replace(/[^\d+]/g, "");
        let phone = cleaned.replace(/^(\+91|91)/, "");
        if (phone.length === 10 && /^[6-9]/.test(phone)) {
          return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
        }
        return v;
      }
    },
    { 
      key: "receiverAddress", 
      label: "Receiver Address", 
      required: true, 
      type: "string", 
      validator: (v) => v?.trim().length >= 10,
      formatter: (v) => v?.trim()
    },
    { 
      key: "receiverCity", 
      label: "City", 
      required: true, 
      type: "city", 
      validator: (v) => {
        const city = v?.toLowerCase()?.trim();
        return Object.keys(INDIAN_LOGISTICS.cities).includes(city) ||
               Object.values(INDIAN_LOGISTICS.cities).some(c => 
                 c.aliases?.includes(city)
               );
      },
      formatter: (v) => {
        const city = v?.toLowerCase()?.trim();
        const found = Object.entries(INDIAN_LOGISTICS.cities).find(
          ([name, data]) => name === city || data.aliases?.includes(city)
        );
        return found ? found[0] : v?.trim();
      }
    },
    { 
      key: "receiverState", 
      label: "State", 
      required: true, 
      type: "state", 
      validator: (v, row, mapping) => {
        const city = row[mapping.receiverCity]?.toLowerCase()?.trim();
        const cityData = INDIAN_LOGISTICS.cities[city];
        const expectedState = cityData?.state;
        return !expectedState || v?.toLowerCase()?.trim() === expectedState.toLowerCase();
      },
      formatter: (v, row, mapping) => {
        const city = row[mapping.receiverCity]?.toLowerCase()?.trim();
        const cityData = INDIAN_LOGISTICS.cities[city];
        return cityData?.state || v?.trim();
      }
    },
    { 
      key: "receiverPincode", 
      label: "PIN Code", 
      required: true, 
      type: "pincode", 
      validator: (v, row, mapping) => {
        const pin = v?.toString()?.trim();
        if (!/^[1-8][0-9]{5}$/.test(pin)) return false;
        
        const city = row[mapping.receiverCity]?.toLowerCase()?.trim();
        const cityData = INDIAN_LOGISTICS.cities[city];
        if (!cityData?.pinPrefixes) return true;
        
        return cityData.pinPrefixes.some(prefix => pin.startsWith(prefix));
      },
      formatter: (v, row, mapping) => {
        let pin = v?.toString()?.replace(/\D/g, "");
        if (pin.length === 7) pin = pin.slice(1);
        if (pin.length === 5) pin = "0" + pin;
        
        const city = row[mapping.receiverCity]?.toLowerCase()?.trim();
        const cityData = INDIAN_LOGISTICS.cities[city];
        
        if (pin.length === 6 && /^[1-8]/.test(pin)) {
          if (cityData?.pinPrefixes && !cityData.pinPrefixes.some(p => pin.startsWith(p))) {
            return cityData.pinPrefixes[0] + "001";
          }
          return pin;
        }
        return v;
      }
    },
    { 
      key: "weight", 
      label: "Weight (kg)", 
      required: true, 
      type: "number", 
      validator: (v) => {
        const w = parseFloat(v);
        return !isNaN(w) && w > 0 && w <= 1000;
      },
      formatter: (v) => {
        const w = parseFloat(v);
        if (isNaN(w) || w <= 0) return "1.0";
        if (w > 1000) return "1000";
        return w.toFixed(2);
      }
    },
    { key: "length", label: "Length (cm)", required: false, type: "number", validator: (v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) > 0) },
    { key: "width", label: "Width (cm)", required: false, type: "number", validator: (v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) > 0) },
    { key: "height", label: "Height (cm)", required: false, type: "number", validator: (v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) > 0) },
    { key: "declaredValue", label: "Declared Value (₹)", required: false, type: "number", validator: (v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0) }
  ];
  
  const SERVICE_TYPES = {
    standard: { label: "Standard", rate: 45, days: "3-7", divisor: 6000 },
    express: { label: "Express", rate: 85, days: "1-3", divisor: 5000 },
    sameDay: { label: "Same Day", rate: 150, days: "Today", divisor: 4000 },
    economy: { label: "Economy", rate: 25, days: "7-14", divisor: 10000 }
  };
  
  useEffect(() => {
    const saved = localStorage.getItem("atirathBulkUploads");
    if (saved) setRecentUploads(JSON.parse(saved));
  }, []);
  
  // ========================================
  // 🔧 REAL AUTO-FIX FUNCTIONS
  // ========================================
  
  const validateAndSuggestFix = (value, columnConfig, row, allMappings) => {
    const isValid = columnConfig.validator(value, row, allMappings);
    if (isValid) return { valid: true, value, suggestion: null, error: null };
    
    let suggestion = null;
    if (columnConfig.formatter) {
      suggestion = columnConfig.formatter(value, row, allMappings);
    }
    
    const suggestionValid = suggestion && columnConfig.validator(suggestion, { ...row, [columnConfig.key]: suggestion }, allMappings);
    
    return {
      valid: false,
      value,
      suggestion: suggestionValid ? suggestion : null,
      error: `Invalid ${columnConfig.label}`
    };
  };
  
  const autoFixAllErrors = () => {
    if (!previewData.length || !Object.keys(columnMapping).length) return 0;
    
    const fixedData = previewData.map((row) => {
      const newRow = { ...row };
      let changed = false;
      
      REQUIRED_COLUMNS.forEach(col => {
        if (columnMapping[col.key] && row[columnMapping[col.key]]) {
          const result = validateAndSuggestFix(
            row[columnMapping[col.key]],
            col,
            row,
            columnMapping
          );
          if (!result.valid && result.suggestion && result.suggestion !== result.value) {
            newRow[columnMapping[col.key]] = result.suggestion;
            changed = true;
          }
        }
      });
      
      return changed ? newRow : row;
    });
    
    setPreviewData(fixedData);
    validatePreviewData(fixedData, columnMapping);
    return fixedData.filter((row, idx) => JSON.stringify(row) !== JSON.stringify(previewData[idx])).length;
  };
  
  // ========================================
  // 📁 FILE UPLOAD HANDLERS
  // ========================================
  const handleFileSelect = useCallback((selectedFile, type = "csv") => {
    if (!selectedFile) return;
    
    const validExtensions = type === "csv" ? [".csv"] : [".json"];
    const fileExtension = selectedFile.name.slice(selectedFile.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      setUploadStatus("error");
      setErrors([`Please upload a ${type.toUpperCase()} file`]);
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrors(["File too large. Maximum size is 10MB."]);
      return;
    }
    
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileSize(selectedFile.size);
    setUploadStatus(null);
    setErrors([]);
    setEditableRow(null);
    
    if (type === "csv") {
      parseCSVFile(selectedFile);
    } else {
      parseJSONFile(selectedFile);
    }
  }, []);
  
  const parseCSVLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const parseCSVFile = async (file) => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) throw new Error("CSV file must have headers and at least one data row");
      
      const headers = parseCSVLine(lines[0]);
      setColumns(headers);
      
      const autoMapping = {};
      REQUIRED_COLUMNS.forEach(req => {
        let match = headers.find(h => h.toLowerCase() === req.key.toLowerCase());
        if (!match) {
          match = headers.find(h => 
            h.toLowerCase().includes(req.key.toLowerCase()) ||
            h.toLowerCase().includes(req.label.toLowerCase())
          );
        }
        if (match) autoMapping[req.key] = match;
      });
      setColumnMapping(autoMapping);
      
      const jsonData = [];
      for (let i = 1; i < Math.min(lines.length, 101); i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
        jsonData.push(row);
      }
      
      setOriginalData(jsonData);
      setPreviewData(jsonData.slice(0, 10));
      validatePreviewData(jsonData.slice(0, 10), autoMapping);
      
    } catch (err) {
      setErrors([`CSV Parse Error: ${err.message}`]);
    }
  };
  
  const parseJSONFile = async (file) => {
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      if (!Array.isArray(jsonData)) throw new Error("JSON must contain an array of shipments");
      if (jsonData.length === 0) throw new Error("JSON array cannot be empty");
      
      const keys = Object.keys(jsonData[0]);
      setColumns(keys);
      
      const autoMapping = {};
      REQUIRED_COLUMNS.forEach(req => {
        if (keys.includes(req.key)) autoMapping[req.key] = req.key;
      });
      setColumnMapping(autoMapping);
      
      setOriginalData(jsonData);
      setPreviewData(jsonData.slice(0, 10));
      validatePreviewData(jsonData.slice(0, 10), autoMapping);
      
    } catch (err) {
      setErrors([`JSON Parse Error: ${err.message}`]);
    }
  };
  
  const parsePastedData = () => {
    if (!pasteData.trim()) {
      setErrors(["Please paste your data first"]);
      return;
    }
    
    try {
      const lines = pasteData.trim().split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        setErrors(["Please paste at least header row and one data row"]);
        return;
      }
      
      const separator = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(separator).map(h => h.trim());
      
      const jsonData = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
        jsonData.push(row);
      }
      
      setColumns(headers);
      
      const autoMapping = {};
      REQUIRED_COLUMNS.forEach(req => {
        const match = headers.find(h => 
          h.toLowerCase().includes(req.key.toLowerCase()) ||
          h.toLowerCase().includes(req.label.toLowerCase())
        );
        if (match) autoMapping[req.key] = match;
      });
      setColumnMapping(autoMapping);
      
      setOriginalData(jsonData);
      setPreviewData(jsonData.slice(0, 10));
      validatePreviewData(jsonData.slice(0, 10), autoMapping);
      
    } catch (err) {
      setErrors([`Parse Error: ${err.message}`]);
    }
  };
  
  const validatePreviewData = (data, mappings) => {
    const validationErrors = [];
    
    data.forEach((row, idx) => {
      REQUIRED_COLUMNS.forEach(col => {
        if (col.required && mappings[col.key]) {
          const value = row[mappings[col.key]];
          const result = validateAndSuggestFix(value, col, row, mappings);
          
          if (!result.valid) {
            validationErrors.push({
              row: idx + 2,
              field: col.label,
              fieldKey: col.key,
              value: result.value,
              suggestion: result.suggestion,
              error: result.error
            });
          }
        }
      });
    });
    
    setErrors(validationErrors);
    return validationErrors;
  };
  
  // ========================================
  // 📝 INLINE EDITING
  // ========================================
  const startEditing = (rowIndex, columnName) => {
    setEditableRow({ rowIndex, columnName });
  };
  
  const saveEdit = (rowIndex, columnName, newValue) => {
    const updated = [...previewData];
    const colConfig = REQUIRED_COLUMNS.find(c => c.key === columnName);
    const fileColumn = columnMapping[columnName] || columnName;
    
    let formattedValue = newValue;
    if (colConfig?.formatter) {
      formattedValue = colConfig.formatter(newValue, updated[rowIndex], columnMapping);
    }
    
    updated[rowIndex][fileColumn] = formattedValue;
    setPreviewData(updated);
    setEditableRow(null);
    
    if (colConfig) {
      const result = validateAndSuggestFix(formattedValue, colConfig, updated[rowIndex], columnMapping);
      if (!result.valid) {
        setErrors(prev => [...prev.filter(e => !(e.row === rowIndex + 2 && e.field === colConfig.label)), {
          row: rowIndex + 2,
          field: colConfig.label,
          fieldKey: colConfig.key,
          value: formattedValue,
          suggestion: result.suggestion,
          error: result.error
        }]);
      } else {
        setErrors(prev => prev.filter(e => !(e.row === rowIndex + 2 && e.field === colConfig.label)));
      }
    }
  };
  
  const cancelEdit = () => setEditableRow(null);
  
  const applySuggestion = (errorObj) => {
    if (!errorObj.suggestion) return;
    
    const updated = [...previewData];
    const rowIndex = errorObj.row - 2;
    const colConfig = REQUIRED_COLUMNS.find(c => c.label === errorObj.field);
    
    if (colConfig && columnMapping[colConfig.key]) {
      const fileColumn = columnMapping[colConfig.key];
      updated[rowIndex][fileColumn] = errorObj.suggestion;
      setPreviewData(updated);
      setErrors(prev => prev.filter(e => e !== errorObj));
    }
  };
  
  const bulkFixByType = (fieldType) => {
    const colConfig = REQUIRED_COLUMNS.find(c => c.type === fieldType);
    if (!colConfig || !columnMapping[colConfig.key]) return 0;
    
    const fileColumn = columnMapping[colConfig.key];
    let fixedCount = 0;
    
    const updated = previewData.map((row) => {
      const value = row[fileColumn];
      const result = validateAndSuggestFix(value, colConfig, row, columnMapping);
      
      if (!result.valid && result.suggestion && result.suggestion !== result.value) {
        fixedCount++;
        return { ...row, [fileColumn]: result.suggestion };
      }
      return row;
    });
    
    setPreviewData(updated);
    validatePreviewData(updated, columnMapping);
    return fixedCount;
  };
  
  // ========================================
  // DRAG & DROP
  // ========================================
  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile, activeTab === "json" ? "json" : "csv");
  }, [activeTab, handleFileSelect]);
  
  const handleMappingChange = (atirathKey, fileColumn) => {
    const newMapping = { ...columnMapping, [atirathKey]: fileColumn || "" };
    setColumnMapping(newMapping);
    if (previewData.length > 0) validatePreviewData(previewData, newMapping);
  };
  
  // ========================================
  // PROCESS UPLOAD
  // ========================================
  const handleProcessUpload = async () => {
    const validationErrors = validatePreviewData(previewData, columnMapping);
    if (validationErrors.length > 0) {
      setUploadStatus("error");
      setErrors(validationErrors.slice(0, 10));
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setUploadStatus(null);
    setErrors([]);
    
    try {
      const totalRows = previewData.length;
      let processed = 0;
      
      for (let i = 0; i < totalRows; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const row = previewData[i];
        let rowValid = true;
        
        REQUIRED_COLUMNS.filter(c => c.required).forEach(col => {
          if (columnMapping[col.key]) {
            const value = row[columnMapping[col.key]];
            if (!col.validator(value, row, columnMapping)) rowValid = false;
          }
        });
        
        if (rowValid) setSuccessCount(prev => prev + 1);
        else setErrors(prev => [...prev, `Row ${i + 2}: Validation failed`]);
        
        processed++;
        setProgress(Math.round((processed / totalRows) * 100));
      }
      
      const uploadRecord = {
        id: Date.now(),
        fileName: fileName || "Manual Entry",
        fileSize,
        timestamp: new Date().toISOString(),
        totalRows: previewData.length,
        successCount: successCount + 1,
        serviceType
      };
      
      const updated = [uploadRecord, ...recentUploads.slice(0, 4)];
      setRecentUploads(updated);
      localStorage.setItem("atirathBulkUploads", JSON.stringify(updated));
      
      setUploadStatus("success");
      
    } catch (err) {
      setUploadStatus("error");
      setErrors([`Processing failed: ${err.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const downloadTemplate = () => {
    const headers = REQUIRED_COLUMNS.map(c => c.label).join(",");
    const sampleRow = [
      "ATL-REF-001", "John Doe", "+91 98765 43210", "123 Main Street, Apartment 4B",
      "Mumbai", "Maharashtra", "400001", "2.5", "30", "20", "15", "1500"
    ].map(f => `"${f}"`).join(",");
    
    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Atirath_BulkUpload_Template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const handleReset = () => {
    setFile(null);
    setFileName("");
    setFileSize(0);
    setPreviewData([]);
    setOriginalData([]);
    setColumns([]);
    setColumnMapping({});
    setUploadStatus(null);
    setErrors([]);
    setSuccessCount(0);
    setProgress(0);
    setEditableRow(null);
    setPasteData("");
    setManualEntries([{ id: Date.now() }]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
  
  const addManualEntry = () => setManualEntries(prev => [...prev, { id: Date.now() }]);
  const removeManualEntry = (id) => {
    if (manualEntries.length > 1) setManualEntries(prev => prev.filter(e => e.id !== id));
  };
  const updateManualEntry = (id, field, value) => {
    setManualEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };
  
  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="bulk-upload-page">
      {/* Header */}
      <header className="bu-header">
        <div className="bu-header-content">
          <Link to="/" className="bu-logo">
            <img src={logo} alt="ATIRATH Logo" className="bu-logo-img" />
            <span className="bu-logo-text">ATIRATH LOGISTICS</span>
          </Link>
          <nav className="bu-nav">
            <Link to="/">Home</Link>
            <Link to="/tracking">Track</Link>
            <Link to="/booking">Book</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </header>
      
      {/* Hero */}
      <section className="bu-hero">
        <div className="bu-hero-content">
          <h1>Bulk Shipment Upload</h1>
          <p>Real Indian Logistics Validation • Auto-Fix Errors • Edit Inline • Production Ready</p>
          <button className="bu-template-btn" onClick={downloadTemplate}>
            📥 Download CSV Template
          </button>
        </div>
      </section>
      
      {/* Main Container */}
      <div className="bu-main-container">
        {/* Upload Method Tabs */}
        <div className="bu-upload-tabs">
          <button className={activeTab === "csv" ? "active" : ""} onClick={() => setActiveTab("csv")}>📁 CSV</button>
          <button className={activeTab === "json" ? "active" : ""} onClick={() => setActiveTab("json")}>📄 JSON</button>
          <button className={activeTab === "paste" ? "active" : ""} onClick={() => setActiveTab("paste")}>📋 Paste</button>
          <button className={activeTab === "manual" ? "active" : ""} onClick={() => setActiveTab("manual")}>✍️ Manual</button>
          <button className={activeTab === "automation" ? "active" : ""} onClick={() => setActiveTab("automation")}>🤖 Auto</button>
        </div>
        
        {/* CSV Upload Section */}
        {activeTab === "csv" && (
          <div className="bu-upload-card">
            <h2>📁 Upload CSV File</h2>
            <div 
              className={`bu-dropzone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".csv" onChange={(e) => handleFileSelect(e.target.files[0], "csv")} className="bu-file-input" hidden />
              {file ? (
                <div className="bu-file-preview">
                  <div className="bu-file-icon">📄</div>
                  <div className="bu-file-info">
                    <strong className="bu-file-name">{fileName}</strong>
                    <span className="bu-file-size">{formatFileSize(fileSize)}</span>
                  </div>
                  <button className="bu-remove-file" onClick={(e) => { e.stopPropagation(); handleReset(); }}>✕</button>
                </div>
              ) : (
                <div className="bu-dropzone-content">
                  <div className="bu-dropzone-icon">📤</div>
                  <p><strong>Drag & drop</strong> CSV file or <span className="bu-browse-link">browse</span></p>
                  <p className="bu-dropzone-hint">Max 10MB • Indian logistics format</p>
                </div>
              )}
            </div>
            
            {/* Column Mapping */}
            {columns.length > 0 && (
              <div className="bu-mapping-section">
                <h4>🔗 Map Your Columns (One-to-One)</h4>
                <p className="bu-mapping-hint">Each Atirath field maps to exactly ONE column in your file</p>
                
                <div className="bu-mapping-grid">
                  {REQUIRED_COLUMNS.map((req) => (
                    <div key={req.key} className="bu-mapping-row">
                      <label className={`bu-mapping-label ${req.required ? "required" : ""}`}>
                        {req.label}
                        {req.required && <span className="bu-required">*</span>}
                      </label>
                      <select
                        value={columnMapping[req.key] || ""}
                        onChange={(e) => handleMappingChange(req.key, e.target.value)}
                        className="bu-select small"
                      >
                        <option value="">-- Select Column --</option>
                        {columns.map((col) => (
                          <option 
                            key={col} 
                            value={col}
                            disabled={Object.values(columnMapping).includes(col) && columnMapping[req.key] !== col}
                          >
                            {col} {Object.values(columnMapping).includes(col) && columnMapping[req.key] !== col ? "(mapped)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Preview with Inline Editing */}
        {previewData.length > 0 && (
          <div className="bu-preview-card">
            <div className="bu-preview-header">
              <h2>👁️ Data Preview & Edit</h2>
              <div className="bu-preview-actions">
                {errors.length > 0 && (
                  <>
                    <button className="bu-btn small outline" onClick={() => autoFixAllErrors()}>
                      ✨ Auto-Fix All ({errors.length})
                    </button>
                    <button className="bu-btn small outline" onClick={() => bulkFixByType("phone")}>
                      📱 Fix Phones
                    </button>
                    <button className="bu-btn small outline" onClick={() => bulkFixByType("pincode")}>
                      📮 Fix PINs
                    </button>
                  </>
                )}
                <span className="bu-preview-count">
                  {previewData.length} rows • {errors.length} errors
                </span>
              </div>
            </div>
            
            {/* Error Summary */}
            {errors.length > 0 && (
              <div className="bu-error-summary">
                <h4>⚠️ {errors.length} Issues Found</h4>
                <div className="bu-error-list-compact">
                  {errors.slice(0, 5).map((err, idx) => (
                    <div key={idx} className="bu-error-item">
                      <span>Row {err.row}: {err.field}</span>
                      {err.suggestion && (
                        <button className="bu-fix-btn" onClick={() => applySuggestion(err)}>
                          Fix: {err.suggestion}
                        </button>
                      )}
                    </div>
                  ))}
                  {errors.length > 5 && <span>...and {errors.length - 5} more</span>}
                </div>
              </div>
            )}
            
            {/* Editable Table */}
            <div className="bu-table-container">
              <table className="bu-preview-table editable">
                <thead>
                  <tr>
                    <th className="bu-row-num">#</th>
                    {REQUIRED_COLUMNS.slice(0, 7).map(col => (
                      <th key={col.key}>
                        {col.label}
                        {columnMapping[col.key] && (
                          <span className="bu-mapped-from">← {columnMapping[col.key]}</span>
                        )}
                        {col.required && <span className="bu-required-mark">*</span>}
                      </th>
                    ))}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => {
                    const rowErrors = errors.filter(e => e.row === idx + 2);
                    return (
                      <tr key={idx} className={rowErrors.length > 0 ? "bu-row-error" : ""}>
                        <td className="bu-row-num">{idx + 1}</td>
                        {REQUIRED_COLUMNS.slice(0, 7).map(col => {
                          const fileCol = columnMapping[col.key];
                          const value = fileCol ? row[fileCol] : "";
                          const isEditing = editableRow?.rowIndex === idx && editableRow?.columnName === col.key;
                          const fieldError = rowErrors.find(e => e.field === col.label);
                          
                          return (
                            <td 
                              key={col.key} 
                              className={`bu-cell ${fieldError ? "bu-cell-error" : ""}`}
                              onClick={() => !isEditing && startEditing(idx, col.key)}
                            >
                              {isEditing ? (
                                <div className="bu-edit-mode">
                                  <input
                                    type={col.type === "number" ? "number" : "text"}
                                    defaultValue={value}
                                    className="bu-edit-input"
                                    autoFocus
                                    onBlur={(e) => saveEdit(idx, col.key, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveEdit(idx, col.key, e.target.value);
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                  />
                                  <button className="bu-edit-save">✓</button>
                                  <button className="bu-edit-cancel" onClick={cancelEdit}>✕</button>
                                </div>
                              ) : (
                                <>
                                  {value || "-"}
                                  {fieldError?.suggestion && (
                                    <button 
                                      className="bu-suggestion-chip"
                                      onClick={() => applySuggestion(fieldError)}
                                      title="Click to apply fix"
                                    >
                                      → {fieldError.suggestion}
                                    </button>
                                  )}
                                  {fieldError && !fieldError.suggestion && (
                                    <span className="bu-error-chip" title={fieldError.error}>⚠️</span>
                                  )}
                                </>
                              )}
                            </td>
                          );
                        })}
                        <td className="bu-status-cell">
                          {rowErrors.length === 0 ? (
                            <span className="bu-status-ok">✓</span>
                          ) : (
                            <span className="bu-status-error" title={rowErrors.map(e => e.error).join(", ")}>
                              {rowErrors.length} issue{rowErrors.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <p className="bu-edit-hint">
              💡 Click any cell to edit • Press Enter to save • Esc to cancel • Green chips auto-fix errors
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        {previewData.length > 0 && (
          <div className="bu-actions">
            <button 
              className="bu-btn primary"
              onClick={handleProcessUpload}
              disabled={isProcessing || errors.length > 0}
              title={errors.length > 0 ? "Fix all errors first" : "Process shipments"}
            >
              {isProcessing ? `Processing ${progress}%...` : `🚀 Process ${previewData.length} Shipments`}
            </button>
            <button className="bu-btn outline" onClick={handleReset}>🔄 Reset</button>
          </div>
        )}
        
        {/* Status Messages */}
        {uploadStatus === "success" && (
          <div className="bu-status success">
            <div className="bu-status-icon">✅</div>
            <div>
              <h3>Upload Successful!</h3>
              <p>{successCount} of {previewData.length} shipments processed successfully</p>
            </div>
          </div>
        )}
        
        {uploadStatus === "error" && errors.length > 0 && (
          <div className="bu-status error">
            <div className="bu-status-icon">⚠️</div>
            <div>
              <h3>Validation Errors</h3>
              <p>Please fix the errors above or use Auto-Fix</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}