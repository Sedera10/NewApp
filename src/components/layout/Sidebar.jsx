import { NavLink } from 'react-router-dom';
import { 
  MdCloudUpload, 
  MdWarning,
  MdSettings, 
  MdKeyboardCommandKey
} from 'react-icons/md';
import './Sidebar.css';
import logoUrl from '/logo.png'

export default function Sidebar({ isOpen }) {
  return (
    <aside className="sidebar d-flex flex-column">
      
      {/* En-tête de la Sidebar (Logo) */}
      <div className="logo p-4 pb-0 d-flex justify-content-center">
        <img src={logoUrl} alt="MyStore logo" style={{ height: '50px', width: 'auto', objectFit: 'contain', display: 'block' }} />
      </div>

      {/* Ligne de séparation subtile */}
      <hr className="horizontal dark mt-3 mb-3 mx-3" />

      {/* Menu de navigation */}
      <div className="sidebar-nav w-100 px-3">
        <ul className="nav flex-column w-100">
          
          <li className="nav-item">
            <h6 className="ps-4 ms-2 text-uppercase text-xs font-weight-bolder opacity-5 mt-2">Configurations</h6>
          </li>

          <li className="nav-item">
            <NavLink to="/mystore/admin/import" className="nav-link text-dark d-flex align-items-center mb-1">
              <div className="icon-box me-3 d-flex align-items-center justify-content-center">
                <MdCloudUpload size={20} />
              </div>
              <span>Importation</span>
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink to="/mystore/admin/reset" className="nav-link text-dark d-flex align-items-center mb-1">
              <div className="icon-box me-3 d-flex align-items-center justify-content-center text-danger">
                <MdWarning size={20} />
              </div>
              <span>Réinitialisation</span>
            </NavLink>
          </li>

          <li className="nav-item mt-4">
            <h6 className="ps-4 ms-2 text-uppercase text-xs font-weight-bolder opacity-5">Commandes</h6>
          </li>

          <li className="nav-item">
            <NavLink to="/mystore/admin/commandes" className="nav-link text-dark d-flex align-items-center mb-1">
              <div className="icon-box me-3 d-flex align-items-center justify-content-center">
                <MdKeyboardCommandKey size={20} />
              </div>
              <span>Liste</span>
            </NavLink>
          </li>

        </ul>
      </div>

      {/* Call to action en bas */}
      <div className="sidebar-footer mt-auto p-3">
        <div className="btn w-100 text-white font-weight-bold" style={{ background: 'var(--primary-gradient)', border: 'none', pointerEvents: 'none' }}>
          ETU 003343
        </div>
      </div>

    </aside>
  );
}