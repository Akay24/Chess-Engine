import React from 'react';
export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
	<div className={`rounded shadow bg-white p-4 ${className}`}>
		{children}
	</div>
);
