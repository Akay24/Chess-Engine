import React from 'react';
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
	<button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition" {...props}>
		{children}
	</button>
);
