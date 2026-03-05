import React, { useState, useEffect, useCallback } from 'react';
import { reviewsAPI } from '../../services/api';
import { Review } from '../../types';
import {
    Star,
    Trash2,
    Search,
    ChevronLeft,
    ChevronRight,
    User as UserIcon
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useSocket } from '../../contexts/SocketContext';

const ReviewManagement: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        pages: 1
    });

    const { socket } = useSocket();

    const fetchReviews = useCallback(async (page: number = 1, search: string = '', silent: boolean = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await reviewsAPI.getReviews({
                page,
                limit: 10,
                search,
                showAll: 'true' // Show both approved and unapproved
            });

            if (response.success && response.data) {
                setReviews(response.data);
                const rawResponse = response as any;
                setPagination({
                    page: rawResponse.pagination?.page || 1,
                    limit: rawResponse.pagination?.limit || 10,
                    pages: rawResponse.pagination?.pages || 1,
                    total: rawResponse.total || 0
                });
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchReviews(1, searchTerm);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, fetchReviews]);

    // Socket events for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleNewReview = () => {
            fetchReviews(pagination.page, searchTerm, true);
        };

        const handleReviewDeleted = () => {
            fetchReviews(pagination.page, searchTerm, true);
        };

        socket.on('new-review', handleNewReview);
        socket.on('review-deleted', handleReviewDeleted);

        return () => {
            socket.off('new-review', handleNewReview);
            socket.off('review-deleted', handleReviewDeleted);
        };
    }, [socket, pagination.page, searchTerm, fetchReviews]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this review?')) {
            return;
        }

        try {
            const response = await reviewsAPI.deleteReview(id);
            if (response.success) {
                toast.success('Review deleted successfully');
                fetchReviews(pagination.page, searchTerm);
            }
        } catch (error) {
            console.error('Error deleting review:', error);
            toast.error('Failed to delete review');
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="d-flex gap-1 text-warning">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        size={16}
                        fill={i < rating ? "currentColor" : "none"}
                        className={i < rating ? "" : "text-muted opacity-25"}
                    />
                ))}
            </div>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US');
    };

    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <div>
                    <h2 className="admin-card-title">Review Management</h2>
                    <p className="admin-card-subtitle">Monitor and manage customer feedback</p>
                </div>
                <div className="admin-search">
                    <div className="position-relative">
                        <Search className="text-muted position-absolute top-50 start-0 translate-middle-y ms-3" size={18} style={{ zIndex: 1 }} />
                        <input
                            type="text"
                            className="admin-search-input ps-5"
                            placeholder="Filter by customer name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="admin-card-body p-0">
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Rating</th>
                                <th>Review Content</th>
                                <th>Room</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : reviews.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5 text-muted">
                                        No reviews found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                reviews.map((review) => {
                                    const user = typeof review.user === 'object' ? review.user : null;
                                    const room = typeof review.room === 'object' ? review.room : null;
                                    const reviewId = review.id || (review as any)._id;

                                    return (
                                        <tr key={reviewId}>
                                            <td>
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="user-avatar" style={{ width: '40px', height: '40px' }}>
                                                        {user?.avatar && user.avatar !== 'avatar-default.png' ? (
                                                            <img
                                                                src={user.avatar}
                                                                alt=""
                                                                className="rounded-circle w-100 h-100 object-fit-cover"
                                                                onError={(e) => {
                                                                    (e.target as any).src = '';
                                                                    (e.target as any).style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <UserIcon size={18} />
                                                        )}
                                                    </div>
                                                    <div className="d-flex flex-column">
                                                        <span className="fw-semibold text-dark">{user?.name || 'Anonymous'}</span>
                                                        <span className="text-muted small">{formatDate(review.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{renderStars(review.rating)}</td>
                                            <td>
                                                <div className="d-flex flex-column" style={{ maxWidth: '400px' }}>
                                                    <span className="fw-semibold text-dark mb-1">{review.title}</span>
                                                    <p className="text-muted small mb-0 text-truncate-2" title={review.comment}>
                                                        {review.comment}
                                                    </p>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="admin-badge admin-badge-primary text-uppercase" style={{ fontSize: '0.7rem' }}>
                                                    {room?.name || review.roomType || 'Room'}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <button
                                                    className="btn btn-link text-danger p-0"
                                                    onClick={() => handleDelete(reviewId)}
                                                    title="Delete Review"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="admin-card-footer">
                <div className="d-flex align-items-center justify-content-between w-100">
                    <span className="text-muted small">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reviews
                    </span>
                    <div className="d-flex gap-2">
                        <button
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            disabled={pagination.page <= 1 || loading}
                            onClick={() => fetchReviews(pagination.page - 1, searchTerm)}
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </button>
                        <button
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            disabled={pagination.page >= pagination.pages || loading}
                            onClick={() => fetchReviews(pagination.page + 1, searchTerm)}
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewManagement;
