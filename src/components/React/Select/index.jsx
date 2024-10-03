import React, { useState, useEffect, useRef } from 'react';
import './styles.scss';

// Функция для обработки клика вне компонента
function useClickOutside(ref, handler) {
	useEffect(() => {
		const listener = (event) => {
			if (!ref.current || ref.current.contains(event.target)) {
				return;
			}
			handler(event);
		};

		document.addEventListener('mousedown', listener);
		return () => {
			document.removeEventListener('mousedown', listener);
		};
	}, [ref, handler]);
}

export default function Select({
	options = [],
	placeholder = 'Select a Value',
	to = false,
	id = false,
	//   obj = false,
	search = false,
	select = '',
	onChanged,
	className = '',
	...rest
}) {
	const [isActive, setIsActive] = useState(false);
	const [isSelected, setIsSelected] = useState(false);
	const [searchQuery, setSearchQuery] = useState(''); // Состояние для хранения поискового запроса
	const [filteredOptions, setFilteredOptions] = useState(options); // Фильтрованные опции
	const labelRef = useRef(null);
	const selectRef = useRef(null);

	// Обработчик клика вне компонента
	useClickOutside(selectRef, () => setIsActive(false));

	// Обработчик для закрытия выпадающего списка по клавише Esc
	useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.key === 'Escape') {
				setIsActive(false);
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, []);

	// Открытие/закрытие выпадающего списка
	const toggle = (e) => {
		const isBlock = e.currentTarget.parentElement.dataset.block;
		if (isBlock === 'true') return;
		setIsActive((prev) => !prev);
	};

	// Клик по опции
	const clickOption = (e) => {
		const val = e.currentTarget.dataset.val;
		const title = e.currentTarget.dataset.title;

		// Обновляем метку и состояние
		if (labelRef.current) {
			labelRef.current.innerText = title || val;
		}

		setIsActive(false);
		setIsSelected(true);

		if (onChanged) {
			onChanged(val);
		}
	};

	// Фильтруем опции на основе поискового запроса
	useEffect(() => {
		const filtered = options.filter((option) =>
			typeof option === 'object'
				? option.name.toLowerCase().includes(searchQuery.toLowerCase())
				: option.toLowerCase().includes(searchQuery.toLowerCase())
		);
		setFilteredOptions(filtered);
	}, [searchQuery, options]);

	useEffect(() => {
		if (select != null) {
			const opt = options.find((item) => item.id === select);
			if (opt && labelRef.current) {
				labelRef.current.innerText = opt.name;
				setIsSelected(true);
			}
		}
	}, [select, options]);

	return (
		<div
			className={`k-select${isActive ? ' active' : ''} ${
				isSelected || options.length === 1 ? 'selected' : ''
			} ${className}`}
			ref={selectRef}
			{...rest}
			tabIndex="-1"
		>
			<a
				href="#"
				className="k-select-head"
				onClick={(e) => e.preventDefault() || toggle(e)}
			>
				<span
					className="k-select-label truncate"
					ref={labelRef}
				>
					{options.length === 1 && typeof options[0] !== 'object'
						? options[0]
						: options.length === 1 && typeof options[0] === 'object'
						? options[0].name
						: placeholder}
				</span>
				<span className="k-select-arrow">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
						className="size-4"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="m19.5 8.25-7.5 7.5-7.5-7.5"
						/>
					</svg>
				</span>
			</a>

			{/* Варианты выбора */}
			{isActive && (
				<div className="k-select-dropdown">
					{search && (
						<input
							type="text"
							placeholder="Поиск..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)} // Отслеживаем ввод в поисковом поле
							className="k-select-search"
						/>
					)}
					{filteredOptions.length > 0 ? (
						filteredOptions.map((option, idx) => (
							<a
								href="#"
								key={id ? option.id : idx}
								data-val={id ? option.id : option}
								data-title={
									typeof option === 'object'
										? option.name
										: option
								}
								className={`${
									id
										? option.id === select
										: idx === select
										? 'selected'
										: ''
								}`}
								onClick={(e) =>
									e.preventDefault() || clickOption(e)
								}
							>
								{typeof option === 'object'
									? option.name
									: option}
							</a>
						))
					) : (
						<p className="px-2.5 !text-base !mb-2.5">
							Нет доступных опций
						</p>
					)}
				</div>
			)}
		</div>
	);
}
