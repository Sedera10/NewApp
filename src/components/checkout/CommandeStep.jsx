import React from 'react';
import './CommandeStep.css';

const CommandeStep = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="commande-steps">
      {steps.map((step, index) => (
        <div key={index} className="step-container">
          <div
            className={`step-indicator ${
              index < currentStep
                ? 'completed'
                : index === currentStep
                ? 'active'
                : 'pending'
            }`}
            onClick={() => index < currentStep && onStepClick && onStepClick(index)}
          >
            {index < currentStep ? '✓' : index + 1}
          </div>
          <div className="step-label">{step}</div>
          {index < steps.length - 1 && (
            <div
              className={`step-line ${
                index < currentStep ? 'completed' : ''
              }`}
            ></div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CommandeStep;
