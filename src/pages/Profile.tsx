import React from 'react';
import { Card } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container py-5">
        <h3>Please login to view your profile.</h3>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4">Profile</h2>
      <Card className="p-3">
        <div><strong>Name:</strong> {user.name}</div>
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Phone:</strong> {user.phone}</div>
        <div><strong>Role:</strong> {user.role}</div>
        <div><strong>Loyalty Points:</strong> {user.loyaltyPoints || 0}</div>
      </Card>
    </div>
  );
};

export default Profile;
