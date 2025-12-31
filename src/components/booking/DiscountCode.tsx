import React, { useState } from 'react';
import { Form, Button, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { Tag, X, Check } from 'lucide-react';
import { bookingsAPI } from '../../services/api';

interface DiscountCodeProps {
  subtotal: number;
  onDiscountApplied: (discount: {
    code: string;
    name: string;
    type: string;
    value: number;
    discountAmount: number;
    finalAmount: number;
  } | null) => void;
  disabled?: boolean;
}

const DiscountCode: React.FC<DiscountCodeProps> = ({ 
  subtotal, 
  onDiscountApplied, 
  disabled = false 
}) => {
  const [discountCode, setDiscountCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setError('Please enter a discount code');
      return;
    }

    if (subtotal <= 0) {
      setError('Invalid booking amount');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await bookingsAPI.validateDiscount(discountCode.trim(), subtotal);
      
      if (response.success && response.data) {
        const discountData = {
          code: response.data.discount.code,
          name: response.data.discount.name,
          type: response.data.discount.type,
          value: response.data.discount.value,
          discountAmount: response.data.discountAmount,
          finalAmount: response.data.finalAmount,
        };

        setAppliedDiscount(discountData);
        setSuccess(`Discount applied successfully! You saved ₹${response.data.savings.toFixed(2)}`);
        onDiscountApplied(discountData);
      } else {
        throw new Error(response.message || 'Failed to apply discount');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to apply discount code';
      setError(errorMessage);
      setAppliedDiscount(null);
      onDiscountApplied(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountCode('');
    setAppliedDiscount(null);
    setError(null);
    setSuccess(null);
    onDiscountApplied(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyDiscount();
    }
  };

  return (
    <div className="discount-code-section">
      <div className="d-flex align-items-center mb-3">
        <Tag size={20} className="me-2 text-primary" />
        <h6 className="mb-0">Have a discount code?</h6>
      </div>

      {!appliedDiscount ? (
        <div>
          <InputGroup className="mb-3">
            <Form.Control
              type="text"
              placeholder="Enter discount code (e.g., WELCOME10)"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              disabled={disabled || loading}
              style={{ textTransform: 'uppercase' }}
            />
            <Button
              variant="outline-primary"
              onClick={handleApplyDiscount}
              disabled={disabled || loading || !discountCode.trim()}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Applying...
                </>
              ) : (
                'Apply'
              )}
            </Button>
          </InputGroup>

          {error && (
            <Alert variant="danger" className="py-2 mb-3">
              <small>{error}</small>
            </Alert>
          )}
        </div>
      ) : (
        <div>
          <Alert variant="success" className="py-2 mb-3">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <Check size={16} className="me-2" />
                <small>
                  <strong>{appliedDiscount.code}</strong> - {appliedDiscount.name}
                  <br />
                  <span className="text-muted">
                    {appliedDiscount.type === 'percentage' 
                      ? `${appliedDiscount.value}% off` 
                      : `₹${appliedDiscount.value} off`
                    } • Saved ₹{appliedDiscount.discountAmount.toFixed(2)}
                  </span>
                </small>
              </div>
              <Button
                variant="link"
                size="sm"
                className="p-0 text-danger"
                onClick={handleRemoveDiscount}
                disabled={disabled}
                title="Remove discount"
              >
                <X size={16} />
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {success && !appliedDiscount && (
        <Alert variant="success" className="py-2 mb-3">
          <small>{success}</small>
        </Alert>
      )}
    </div>
  );
};

export default DiscountCode;