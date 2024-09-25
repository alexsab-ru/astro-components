import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import axios from 'axios';
import ShowErrors from '../ShowErrors';
// Определение схемы валидации с помощью Yup
const vinSchema = yup.object().shape({
	vin: yup
		.string()
		.required('Поле обязательно для заполнения')
		.matches(/^[a-zA-Z0-9]*$/, 'Разрешены только латинские буквы и цифры')
		.min(17, 'Минимальное количество символов - 17')
		.max(25, 'Максимальное количество символов - 25'),
});

const VinForm = () => {
	const [vin, setVin] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		trigger,
	} = useForm({
		resolver: yupResolver(vinSchema),
		defaultValues: {
			vin: '',
		},
	});
	// Обработчик отправки формы
	const onSubmit = async (data) => {
		const isFormCorrect = await trigger();
		if (!isFormCorrect) return;
		// await axios.post("https://api.maxposter.ru/partners-api/vin/info", {
		await axios.post(`${import.meta.env.PUBLIC_MAXPOSTER_URL}/vin/info`, {
			vin: vin,
		},
		{
			headers: {
				"Authorization": `Basic ${import.meta.env.PUBLIC_MAXPOSTER_TOKEN}`,
				"Accept": "application/json",
            "Content-Type": "application/json",
			}
	  })
	  .then(res => {
			console.log(res)
		},
		(error) => {
			console.log("vin-info-error", error);
		}
		)
		// if (store.getters.getBodyNumber.length) {
		// 	store.commit('incrementStep');
		// } else {
		// 	await store.dispatch('fetchVinInfo', vin);
		// }
	};
  
	 // Функция для транслитерации
	const translit = (value) => {
		const translitMap = {
			а: 'a',
			т: 't',
			х: 'x',
		};
		return value.replace(/[а-я]/gi, (matched) => translitMap[matched.toLowerCase()] || matched);
	};
  
	 // Следим за изменениями поля vin и обновляем состояние
	useEffect(() => {
		const newVin = translit(vin.toUpperCase());
		setVin(newVin);
		// store.commit('setVIN', newVin);
		// store.commit('setBodyNumber', '');
	}, [vin]);
	return (
		<form className="mb-10 vue-form" onSubmit={handleSubmit(onSubmit)}>
			<h3 className="text-2xl font-bold mb-6">Введите VIN-номер</h3>
			<div className="flex">
				<input
					type="text"
					className={`w-[270px] border-2 transition-all focus:border-accent-500 px-4 py-2.5 outline-none text-black border-gray-100 ${vin ? '!border-black !text-black' : ''}`}
					placeholder="Введите VIN-номер"
					value={vin}
					{...register('vin')}
					onChange={(e) => setVin(e.target.value)}
				/>
				<button
					className="bg-black text-white w-[48px] h-[48px] m-0 flex justify-center items-center transition-opacity hover:bg-accent-400"
					disabled={isSubmitting}
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 20 20"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						preserveAspectRatio="xMidYMid"
						className=""
					>
						<path
							data-v-134dc84b=""
							d="M8.5 14l4-4-4-4"
							stroke="currentColor"
							strokeWidth="2"
						></path>
					</svg>
				</button>
			</div>
			{errors.vin && <ShowErrors errors={errors.vin.message} /> }
		</form>
	);
}

export default VinForm;