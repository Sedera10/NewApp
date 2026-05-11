import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import './HeroSection.css';

// Les données de nos 3 slides
const slidesData = [
  {
    id: 0,
    title: "MAKE THE MOST OUT OF YOUR SPACE",
    description: "Découvrez notre nouvelle collection de meubles pour optimiser chaque coin de votre maison avec élégance et confort.",
    badge: "35%\nOFF",
    image: "/carrousel/carrousel1.webp", // Remplacez par votre image
    btnText: "Acheter maintenant"
  },
  {
    id: 1,
    title: "NOUVELLE COLLECTION SALON",
    description: "Des lignes épurées et des matériaux durables pour transformer votre salon en un véritable havre de paix.",
    badge: "NEW",
    image: "/carrousel/carrousel2.webp", // Remplacez par votre image
    btnText: "Découvrir"
  },
  {
    id: 2,
    title: "L'ÉLÉGANCE MINIMALISTE",
    description: "Aménagez votre bureau avec notre gamme minimaliste. La simplicité au service de votre productivité.",
    badge: "-20%",
    image: "/carrousel/carrousel3.webp", // Remplacez par votre image
    btnText: "Voir les offres"
  }
];

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Effet pour le défilement automatique
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide === slidesData.length - 1 ? 0 : prevSlide + 1));
    }, 5000); // Change toutes les 5 secondes

    // Nettoyage de l'intervalle si le composant est démonté
    return () => clearInterval(slideInterval);
  }, []);

  return (
    <section className="hero-section">
      {slidesData.map((slide, index) => (
        <div 
          key={slide.id} 
          className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
        >
          {/* Bloc Texte à gauche */}
          <div className="hero-content">
            <h1 className="hero-title">{slide.title}</h1>
            <p className="hero-description">{slide.description}</p>
            <button className="hero-btn">
              {slide.btnText} <ArrowRight size={18} />
            </button>
          </div>

          {/* Bloc Image à droite avec le badge */}
          <div className="hero-image-container">
            <div className="hero-badge">{slide.badge}</div>
            <img src={slide.image} alt={slide.title} className="hero-image" />
          </div>
        </div>
      ))}

      {/* Les petits points de navigation en bas */}
      <div className="hero-dots">
        {slidesData.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Aller au slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSection;