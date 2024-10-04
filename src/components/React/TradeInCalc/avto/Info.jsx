import { useCarInfo } from '@/store/useCarInfo';
import {useTranslit } from '@/js/utils/translit';

function AvtoInfo() {
	const {avtoInfo, noResultFetchMessage} = useCarInfo();
	const rusKey = (key) => {
		const engToRus = {
			brand: { label: "Марка", orderId: 1 },
			model: { label: "Модель", orderId: 2 },
			year: { label: "Год выпуска", orderId: 3 },
			bodyNumber: { label: "VIN", orderId: 4 },
			modification: { label: "Модификация", orderId: 5 },
			generation: { label: "Поколение", orderId: 6 },
			bodyConfiguration: { label: "Тип кузова", orderId: 7 },
			engineType: { label: "Двигатель", orderId: 8 },
			engineVolume: { label: "Объем двигателя (м3)", orderId: 9 },
			enginePower: { label: "Мощность (л.с.)", orderId: 10 },
			driveType: { label: "Привод", orderId: 11 },
			gearboxType: { label: "КПП", orderId: 12 },
		};

		if (!engToRus[key]) return null;

		return { ...engToRus[key] };
	};
	const round = (num) => Math.round(num / 100) / 10;
	return (
		<div className="border-t border-t-gray-400 overflow-hidden">
			<div className="flex flex-col lg:flex-row">
				<div className="w-full lg:w-1/3 lg:pr-10 py-8 lg:py-16 px-5 bg-gray-100">
					<h3 className="text-xl md:text-2xl font-bold mb-6 md:mb-8">Ваш автомобиль</h3>
					{!Object.keys(avtoInfo).length ? (
						<p className="text-gray-700">{noResultFetchMessage}</p>
					) : (
						<ul className="flex flex-col">
							
							{Object.keys(avtoInfo).map(key => rusKey(key) && useTranslit(typeof avtoInfo[key] === 'object' ? avtoInfo[key].name : avtoInfo[key]) && (
								<li
									className={`flex justify-between`}
									key={key}
								>
									<span>{ rusKey(key).label }</span>
									<span className="flex-grow border-b border-dotted mx-2 mb-2"></span>
									{key === 'engineVolume' ? (
										<span className="font-bold">{ useTranslit(typeof avtoInfo[key] === 'object' ? round(avtoInfo[key].name) : round(avtoInfo[key])) }</span>
									) : (
										<span className="font-bold">{ useTranslit(typeof avtoInfo[key] === 'object' ? avtoInfo[key].name : avtoInfo[key]) }</span>
									)}
								</li>
							) )}

							{/* <avto-info-list-item v-for="(value, key) in avtoInfo" :key="key" :value="value" :engKey="key" /> */}

							<li className="flex justify-between order-last mt-5" v-if="!v$.mileage.$invalid && !v$.mileage.numeric.$invalid && Number(mileage) != 0">
								<span>Пробег</span>
								<span className="flex-grow border-b border-dotted mx-2 mb-2"></span>
								<span className="font-bold" v-text="number+' км'"></span>
							</li>

						</ul>
					)}

				</div>
			</div>
		</div>
	);
}

export default AvtoInfo;