import React, { useEffect } from 'react';

const TestEnv = () => {
  useEffect(() => {
    console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('All environment variables:', process.env);
  }, []);

  return <div>Check the browser console for environment variables</div>;
};

export default TestEnv;
