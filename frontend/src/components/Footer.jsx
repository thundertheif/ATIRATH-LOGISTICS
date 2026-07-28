import { Link } from "react-router-dom";
import logo from "../assets/logo_3.png";
import "./Footer.css";

export default function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="contact-footer">
      <div className="footer-grid">
        <div className="footer-col">
          <div className="footer-logo">
            <img src={logo} alt="ATIRATH" className="footer-logo-img" />
            <span>ATIRATH LOGISTICS</span>
          </div>
          <p>Global shipping solutions with local expertise. Delivering excellence since 2020.</p>
          <div className="footer-social">
            <a href="#" aria-label="LinkedIn">in</a>
            <a href="#" aria-label="Twitter">𝕏</a>
            <a href="#" aria-label="Facebook">f</a>
            <a href="#" aria-label="Instagram">📷</a>
          </div>
        </div>
        
        <div className="footer-col">
          <h4>Quick Links</h4>
          <Link to="/about" onClick={scrollToTop}>About Us</Link>
          <Link to="/services" onClick={scrollToTop}>Services</Link>
          <Link to="/pricing" onClick={scrollToTop}>Pricing</Link>
          <Link to="/contact" onClick={scrollToTop}>Contact</Link>
        </div>
        
        <div className="footer-col">
          <h4>Support</h4>
          <Link to="/faq" onClick={scrollToTop}>FAQ</Link>
          <Link to="/tracking" onClick={scrollToTop}>Track Shipment</Link>
          <Link to="/claims" onClick={scrollToTop}>File a Claim</Link>
          <Link to="/help" onClick={scrollToTop}>Help Center</Link>
        </div>
        
        <div className="footer-col">
          <h4>Contact Info</h4>
          <p>📍 Vamsiram Builders, Madhapur Road, Andra Basti, Guttala_Begumpet, Kavuri Hills, Madhapur, Hyderabad, Telangana</p>
          <p>📞 <a href="tel:+919676464756">+91 96764 64756</a></p>
          <p>✉️ <a href="mailto:info@atirathlogistics.com">info@atirathlogistics.com</a></p>
          <p>🕐 Mon-Sat: 9AM - 8PM IST</p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>© 2026 ATIRATH LOGISTICS. All rights reserved.</p>
        <div className="footer-legal">
          <Link to="/privacy" onClick={scrollToTop}>Privacy Policy</Link>
          <span>•</span>
          <Link to="/terms" onClick={scrollToTop}>Terms of Service</Link>
          <span>•</span>
          <Link to="/cookies" onClick={scrollToTop}>Cookie Policy</Link>
        </div>
      </div>
    </footer>
  );
}