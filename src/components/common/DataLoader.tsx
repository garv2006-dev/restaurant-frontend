import React from 'react';
import '../../styles/skeleton.css';
import { Card } from 'react-bootstrap';

interface DataLoaderProps {
    type?: 'table' | 'card' | 'list' | 'text' | 'image';
    count?: number;
    height?: string | number;
    width?: string | number;
    className?: string;
    columns?: number; // For table type
}

const DataLoader: React.FC<DataLoaderProps> = ({
    type = 'text',
    count = 1,
    height,
    width,
    className = '',
    columns = 5,
}) => {
    const renderSkeleton = (key: number) => {
        const style: React.CSSProperties = {
            height: height,
            width: width,
        };

        switch (type) {
            case 'table':
                return (
                    <tr key={key}>
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <td key={colIndex}>
                                <div className={`skeleton-loader skeleton-cell ${className}`} style={style} />
                            </td>
                        ))}
                    </tr>
                );

            case 'card':
                return (
                    <div key={key} className={`col mb-4 ${className}`}>
                        <Card className="h-100 shadow-sm border-0">
                            <div className="skeleton-loader card-img-top" style={{ height: '200px', width: '100%' }} />
                            <Card.Body>
                                <div className="skeleton-loader skeleton-text mb-3" style={{ width: '70%', height: '24px' }} />
                                <div className="skeleton-loader skeleton-text" style={{ width: '100%' }} />
                                <div className="skeleton-loader skeleton-text" style={{ width: '90%' }} />
                                <div className="skeleton-loader skeleton-text" style={{ width: '60%' }} />
                            </Card.Body>
                        </Card>
                    </div>
                );

            case 'list':
                return (
                    <div key={key} className={`d-flex align-items-center mb-3 ${className}`}>
                        <div className="skeleton-loader rounded-circle me-3" style={{ width: '40px', height: '40px' }} />
                        <div className="flex-grow-1">
                            <div className="skeleton-loader skeleton-text mb-1" style={{ width: '40%' }} />
                            <div className="skeleton-loader skeleton-text" style={{ width: '80%' }} />
                        </div>
                    </div>
                );

            case 'image':
                return (
                    <div key={key} className={`skeleton-loader ${className}`} style={{ height: height || '200px', width: width || '100%' }} />
                )

            case 'text':
            default:
                return (
                    <div
                        key={key}
                        className={`skeleton-loader skeleton-text ${className}`}
                        style={style}
                    />
                );
        }
    };

    const items = Array.from({ length: count }).map((_, index) => renderSkeleton(index));

    if (type === 'table') {
        return <>{items}</>;
    }

    if (type === 'card') {
        return <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">{items}</div>
    }

    return <>{items}</>;
};

export default DataLoader;
