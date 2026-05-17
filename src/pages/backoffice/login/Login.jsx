import React, { useState, useEffect }  from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { MdFacebook } from 'react-icons/md';
import { FaGithub, FaGoogle } from 'react-icons/fa';
import { loginBO, loginFO } from '../../../service/authService';
import { urlContains } from '../../../service/Util';
import ConfirmDialog from '../../../components/UI/others/ConfirmDialog';
import './Login.css';

export default function Login() {
    const location = useLocation();
    const navigate = useNavigate();
    const clientForm = !urlContains(location.pathname, "/admin");

    const[error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
      identifier: clientForm ? 'sederavalisoara@gmail.com' : 'Sedera3343',
      password: clientForm ? 'sedera07#' : 'admin3343',
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
      setError(null);
      
      const { identifier, password } = formData;
      
      try {
        if (clientForm) {
          // Authentication Client (FO)
          const session = await loginFO(identifier, password);
          if (session) {
            navigate("/mystore/fr/products"); 
          }
        } else {
          // Authentication Admin (BO)
          const ok = loginBO(identifier, password);
          if (ok) {
            window.location.href = "/mystore/admin/dashboard"; 
          } else {
            setError("Identifiants incorrects");
          }
        }
      } catch (err) {
        setError(err.message || "Erreur lors de la connexion");
      } finally {
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
                <h4 className="text-white mb-4">
                  {clientForm ? "Espace Client" : "Back-Office Admin"}
                </h4>
                <div className="social-icons d-flex justify-content-center gap-4 mb-2">
                  <MdFacebook size={24} className="cursor-pointer" />
                  <FaGithub size={20} className="cursor-pointer" />
                  <FaGoogle size={18} className="cursor-pointer" />
                </div>
                <p className="text-white-50 small mt-3">
                  {clientForm 
                    ? "Saisissez votre email et mot de passe pour vous connecter" 
                    : "Saisissez votre nom d'utilisateur (admin)"}
                </p>
              </div>

              {error && <ConfirmDialog
                  isOpen={true}
                  title='Authentification'
                  message={error}
                  cancelText=''
                  confirmText='Fermer'
                  onConfirm={() => { setError(null)}}
                />}
              {loading && <div className="text-center my-3"><span className="spinner-border spinner-border-sm"></span> Connexion en cours...</div>}

              {/* Corps du formulaire */}
              <div className="card-body p-4 mt-2">
                <form onSubmit={handleSubmit} >
                  <div className="mb-4">
                    <input 
                      type={clientForm ? "email" : "text"} 
                      name="identifier" 
                      value={formData.identifier} 
                      onChange={handleChange} 
                      className="mat-input" 
                      placeholder={clientForm ? "Email" : "Username"} 
                      required 
                    />
                  </div>
                  <div className="mb-4">
                    <input 
                      type="password" 
                      name="password" 
                      value={formData.password} 
                      onChange={handleChange} 
                      className="mat-input" 
                      placeholder="Password" 
                      required 
                    />
                  </div>

                  <button type="submit" disabled={loading}  className="btn w-100 text-white fw-bold py-2 shadow-primary" 
                          style={{ background: 'var(--primary-gradient)', borderRadius: '8px' }}>
                    SIGN IN
                  </button>
                </form>

                <div className="text-center mt-4">
                  <p className="small text-secondary">
                    {clientForm ? "Pas encore de compte ?" : "Problème d'accès ?"} 
                    <NavLink to="#" className="fw-bold text-primary ml-1">
                      {clientForm ? "S'inscrire" : "Contacter le support"}
                    </NavLink>
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