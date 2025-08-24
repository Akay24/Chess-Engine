import { useState, Children, ReactNode } from 'react';
type TabsProps = { labels: string[]; children: ReactNode | ReactNode[] };
export const Tabs = ({ labels, children }: TabsProps) => {
	const [active, setActive] = useState(0);
	const items = Children.toArray(children);
	return (
		<div>
			<div className="flex border-b mb-2">
				{labels.map((label, i) => (
					<button
						key={label}
						className={`px-4 py-2 focus:outline-none ${active === i ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-500'}`}
						onClick={() => setActive(i)}
					>
						{label}
					</button>
				))}
			</div>
			<div>{items[active]}</div>
		</div>
	);
};
