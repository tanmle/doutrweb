'use client';

import { Component, ReactNode } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px',
                    padding: '2rem'
                }}>
                    <Card style={{ maxWidth: '500px', textAlign: 'center', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1rem', color: 'var(--error)' }}>
                            Something went wrong
                        </h2>
                        <p style={{ marginBottom: '1.5rem', color: 'var(--muted-foreground)' }}>
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <Button
                            onClick={() => {
                                this.setState({ hasError: false, error: undefined });
                                window.location.reload();
                            }}
                        >
                            Reload Page
                        </Button>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
