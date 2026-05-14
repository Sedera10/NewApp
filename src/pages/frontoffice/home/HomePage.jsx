import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../../service/Customer';
import { MdPerson } from 'react-icons/md';
import './HomePage.css';

const HomePage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await customerService.getCustomers();
        const usersArray = Array.isArray(fetchedUsers) ? fetchedUsers : [fetchedUsers];
        setUsers(usersArray);
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const getTextVal = (val) => {
    if (val && typeof val === 'object' && val['#text'] !== undefined) {
      return val['#text'];
    }
    return val;
  };

  const handleSelectUser = (user) => {
    if (user) {
      const sessionData = {
        id: getTextVal(user.id),
        firstname: getTextVal(user.firstname),
        lastname: getTextVal(user.lastname),
        email: getTextVal(user.email),
        isLoggedIn: true
      };
      localStorage.setItem('client_session', JSON.stringify(sessionData));
    } else {
      const sessionData = {
        id: "0",
        firstname: "Visiteur",
        lastname: "Anonyme",
        email: "",
        isLoggedIn: true
      };
      localStorage.setItem('client_session', JSON.stringify(sessionData));
    }
    navigate('/mystore/fr/products');
  };

  if (loading) {
    return <div className="user-selection-loading">Chargement des utilisateurs...</div>;
  }

  return (
    <div className="user-selection-container">
      <div className="user-selection-card">
        <h2>Choisissez un compte</h2>
        
        <div className="users-grid">
          {users.map(u => (
            <div 
              key={getTextVal(u.id)} 
              className="user-card"
              onClick={() => handleSelectUser(u)}
            >
              <div className="user-avatar">
                <img src="/user.png" alt="user" className="user-profile-img" onError={(e) => { e.target.style.display = 'none'; }} />
                {!document.querySelector('img[src="/user.png"]') && <MdPerson size={40} color="#555" />}
              </div>
              <div className="user-info">
                <strong>{getTextVal(u.firstname)} {getTextVal(u.lastname)}</strong>
                <span>{getTextVal(u.email)}</span>
              </div>
            </div>
          ))}
          
          <div 
            className="user-card anonymous-card"
            onClick={() => handleSelectUser(null)}
          >
            <div className="user-avatar">
              <img src="/user.png" alt="user" className="user-profile-img" onError={(e) => { e.target.style.display = 'none'; }} />
              <MdPerson size={40} color="#777" />
            </div>
            <div className="user-info">
              <strong>Continuer en tant qu'anonyme</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;