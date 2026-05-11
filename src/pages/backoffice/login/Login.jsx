import React, { useState, useEffect }  from 'react';
import { NavLink } from 'react-router-dom';
import { MdFacebook } from 'react-icons/md';
import { FaGithub, FaGoogle } from 'react-icons/fa';
import { loginBO } from '../../../service/auth/Login';
import './Login.css';

export default function Login() {

    const[error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
      username: 'Sedera3343',
      password: 'admin3343',
    });

    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      
      const { username, password } = formData;
      const ok = loginBO(username, password);
      
      if (ok) {
        setLoading(false);
        setError(null);
        window.location.href = "/mystore/admin/import"; 
      } else {
        setError("Identifiants incorrects");
        setLoading(false);
      }
    };

  return (
    <div className="login-page">
      {/* Bandeau d'en-tête avec l'image de fond */}
      <div className="login-header-bg">
      </div>

      {/* Conteneur du formulaire qui chevauche le bandeau */}
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-5 col-lg-4">
            <div className="mat-card login-card fade-in-up">
              
              {/* En-tête bleu de la carte */}
              <div className="mat-card-header-floating text-center">
                <h4 className="text-white mb-4">Welcome back</h4>
                <div className="social-icons d-flex justify-content-center gap-4 mb-2">
                  <MdFacebook size={24} className="cursor-pointer" />
                  <FaGithub size={20} className="cursor-pointer" />
                  <FaGoogle size={18} className="cursor-pointer" />
                </div>
                <p className="text-white-50 small mt-3">Enter your email and password to sign in</p>
              </div>

              {error && <div className="alert alert-danger text-white">{error}</div>}
              {loading && <div className="text-center my-3"><span className="spinner-border spinner-border-sm"></span> Chargement des options...</div>}

              {/* Corps du formulaire */}
              <div className="card-body p-4 mt-2">
                <form onSubmit={handleSubmit} >
                  <div className="mb-4">
                    <input type="text" name="username" value={formData.username} onChange={handleChange} className="mat-input" placeholder="Username" />
                  </div>
                  <div className="mb-4">
                    <input type="password" name="password" value={formData.password} onChange={handleChange} className="mat-input" placeholder="Password" />
                  </div>

                  <button type="submit" disabled={loading}  className="btn w-100 text-white fw-bold py-2 shadow-primary" 
                          style={{ background: 'var(--primary-gradient)', borderRadius: '8px' }}>
                    SIGN IN
                  </button>
                </form>

                <div className="text-center mt-4">
                  <p className="small text-secondary">
                    Already have an account? <NavLink to="#" className="fw-bold text-primary">Sign In</NavLink>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer simple */}
      <footer className="login-footer text-center py-4 mt-5">
        <p className="text-secondary small">
          © 2026, made with ❤️ by <span className="fw-bold">Sedera Valisoa</span> for a better web.
        </p>
      </footer>
    </div>
  );
}