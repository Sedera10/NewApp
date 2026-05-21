import React from 'react';
import './LoadingProgress.css';

export function LoadingProgress({ title, progress }) {
  // On s'assure que le pourcentage reste toujours entre 0 et 100
  const safePercentage = Math.min(Math.max(progress.percentage, 0), 100);

  return (
    <div className="loading-progress" role="status" aria-live="polite">
      <h5 className="loading-progress__title">
        {title || 'Traitement en cours'}
      </h5>
      <p className="loading-progress__message">
        step {progress.message}
      </p>
      <small className="loading-progress__description">
        {progress.description}
      </small>

      <div className="loading-progress__bar" role="progressbar" aria-valuenow={safePercentage} aria-valuemin="0" aria-valuemax="100">
        <div
          className="loading-progress__bar-fill"
          style={{ width: `${safePercentage}%` }}
        >
          <span className="loading-progress__bar-text">{safePercentage}%</span>
        </div>
      </div>
    </div>

  );
}