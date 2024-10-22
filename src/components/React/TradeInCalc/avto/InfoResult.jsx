import { useCarInfo } from '@/store/useCarInfo';

function AvtoInfoResult() {
	const {avtoInfo, recalculate, setStep, selfSale, dealerPrice } = useCarInfo();
	return ( 
		<>
			<h3 className="text-3xl font-bold mb-10">Расчетная цена {avtoInfo?.brand.name} {avtoInfo?.model.name} — {avtoInfo?.year}&nbsp;г.в.</h3>
			<div className="lg:w-1/3 bg-gray-100 p-6">
				<h3 className="text-2xl font-bold mb-6">Выкуп</h3>
				{dealerPrice !== 0 ? (
					<div className="mb-6">
						<h3 className="text-3xl font-bold">{ dealerPrice.toLocaleString('ru-RU') }&nbsp;₽</h3>
						<p className="!text-xs">Предварительная оценка стоимости автомобиля <sup>*</sup></p>
					</div>
				) : (
					<p className="!text-xs mb-6">К сожалению, по указанным параметрам сделать расчет не удалось</p>
				)}
				<p className="!text-xl">В ближайшее время наш менеджер перезвонит Вам!</p>
			</div>

			<div className="flex flex-wrap justify-between items-center gap-5 text-gray-800 font-medium py-10 px-6 border-b border-b-gray-300 mb-12">
				<div>
					<p className="!mb-3">При самостоятельной продаже</p>
				{selfSale !== 0 ? (
						<p className="font-bold !mb-2">{ selfSale.toLocaleString('ru-RU') }&nbsp;₽</p>
					) : (
						<p className="!mb-0 !text-xs">К сожалению, по указанным параметрам сделать расчет не удалось</p>
					)}
				</div>
				<button
					className="text-black px-5 py-1.5 border border-black border-solid flex items-center justify-center gap-2"
					onClick={() => {setStep(0); recalculate()}}
				><svg  width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" className="w-5"><path d="M16.391 6.5c-1.24-2.092-3.56-3.5-6.215-3.5C6.213 3 3 6.134 3 10s3.213 7 7.176 7S16.39 14.083 17 11.75" stroke="currentColor" strokeWidth={1.5}></path><path d="M17 2.5V7h-4.5" stroke="currentColor" strokeWidth={1.5}></path></svg>Пересчитать</button>
			</div>

			<p className="text-gray-600"><sup>*</sup> Указанная расчетная стоимость является приблизительной и&nbsp;действует при выкупе автомобиля с&nbsp;пробегом. Информация предоставлена <a href="https://maxposter.ru" target="_blank" className="">MaxPoster</a></p>

		</>
	);
}

export default AvtoInfoResult;