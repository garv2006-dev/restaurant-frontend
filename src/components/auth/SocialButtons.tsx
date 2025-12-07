import React from 'react';
import styles from './SocialButtons.module.css';

interface SocialButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

const SocialButton: React.FC<SocialButtonProps> = ({
  onClick,
  disabled = false,
  children,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${styles['social-button']} ${styles[className]}`}
      type="button"
    >
      {children}
    </button>
  );
};

export const GoogleSignInButton: React.FC<Omit<SocialButtonProps, 'children'>> = (props) => {
  return (
    <SocialButton {...props} className="google">
      <div className={styles.icon}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path
            fill="#4285F4"
            d="M16.51 8H8.98v3h4.3c-.18 1-.74 2.1-1.57 2.82v2h2.52c1.48-1.36 2.32-3.38 2.32-5.82 0-.57-.05-1.12-.14-1.64z"
          />
          <path
            fill="#34A853"
            d="M8.98 17c2.16 0 3.97-.72 5.29-1.94l-2.52-2c-.7.47-1.59.73-2.77.73-2.13 0-3.93-1.44-4.57-3.38H1.87v2.06C3.18 15.28 5.9 17 8.98 17z"
          />
          <path
            fill="#FBBC05"
            d="M4.41 10.41c-.17-.51-.26-1.06-.26-1.64s.09-1.13.26-1.64V4.93H1.87C1.31 6.05 1 7.34 1 8.77s.31 2.72.87 3.84l2.54-2.2z"
          />
          <path
            fill="#EA4335"
            d="M8.98 3.58c1.21 0 2.3.42 3.15 1.23l2.23-2.23C12.95 1.36 11.14.64 8.98.64 5.9.64 3.18 2.36 1.87 4.93l2.54 2.2c.64-1.94 2.44-3.38 4.57-3.38z"
          />
        </svg>
      </div>
      Continue with Google
    </SocialButton>
  );
};

// Add a default export to fix the import error
const SocialButtons = {
  GoogleSignInButton
};

export default SocialButtons;
