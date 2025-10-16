import React from 'react';
import { Spinner, Container } from 'react-bootstrap';

interface LoadingSpinnerProps {
  size?: 'sm' | undefined;
  fullScreen?: boolean;
  message?: string;
  variant?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size,
  fullScreen = false,
  message = 'Loading...',
  variant = 'primary'
}) => {
  const spinner = (
    <div className={`text-center ${fullScreen ? 'py-5' : 'py-3'}`}>
      <Spinner animation="border" variant={variant} size={size} />
      {message && <div className="mt-2 text-muted">{message}</div>}
    </div>
  );

  if (fullScreen) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        {spinner}
      </Container>
    );
  }

  return spinner;
};

export default LoadingSpinner;