import { createContext, useContext, useState, useEffect } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // ✅ NEW: Track role
  const [loading, setLoading] = useState(true);

  // ✅ UPDATED: Login function with return value
  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // ✅ CRITICAL: Force token refresh to get latest claims
      await user.getIdToken(true);
      
      // Get token result to check admin claim
      const tokenResult = await user.getIdTokenResult();
      const isAdmin = tokenResult.claims.admin === true;
      
      // Set role in state
      setUserRole(isAdmin ? 'admin' : 'client');
      
      // ✅ RETURN role info
      return {
        success: true,
        role: isAdmin ? 'admin' : 'client',
        user: user
      };
      
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  // ✅ UPDATED: Check current user role on auth state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Get token and check claims
          const tokenResult = await user.getIdTokenResult();
          const isAdmin = tokenResult.claims.admin === true;
          setUserRole(isAdmin ? 'admin' : 'client');
        } catch (error) {
          console.error("Token error:", error);
          setUserRole('client');
        }
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function logout() {
    setUserRole(null);
    return signOut(auth);
  }

  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  const value = {
    currentUser,
    userRole, // ✅ NEW: Expose role
    login,
    logout,
    resetPassword,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}