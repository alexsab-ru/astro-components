import { useCarInfo } from '@/store/useCarInfo';
import { useTranslit, rusKey } from '@/js/utils/translit';

function AvtoInfoList() {
	const {avtoInfo, noResultFetchMessage, mileageState} = useCarInfo();
	
	const round = (num) => Math.round(num / 100) / 10;
	return (
		<div className="w-full lg:w-1/3 lg:pr-10 py-8 lg:py-16 px-5 bg-gray-100">
			<h3 className="text-xl md:text-2xl font-bold mb-6 md:mb-8">Ваш автомобиль</h3>
			{!Object.keys(avtoInfo).length ? (
				<p className="text-gray-700">{noResultFetchMessage}</p>
			) : (
				<ul className="flex flex-col">
					
					{Object.keys(avtoInfo).map(key => rusKey(key) && useTranslit(typeof avtoInfo[key] === 'object' ? avtoInfo[key]?.name : avtoInfo[key]) && (
						<li
							className={`flex justify-between ${rusKey(key).orderId == 3 ? '!mb-8' : '!mb-3'}`}
							style={{ order: rusKey(key).orderId }}
							key={key}
						>
							<span>{ rusKey(key).label }</span>
							<span className="flex-grow border-b border-dotted mx-2 mb-2"></span>
							{key === 'engineVolume' ? (
								<span className="font-bold">{ useTranslit(typeof avtoInfo[key] === 'object' ? round(avtoInfo[key]?.name) : round(avtoInfo[key])) }</span>
							) : (
								<span className="font-bold">{ useTranslit(typeof avtoInfo[key] === 'object' ? avtoInfo[key]?.name : avtoInfo[key]) }</span>
							)}
						</li>
					) )}
					
					{Number(mileageState) !== 0 && (
						<li className="flex justify-between order-last mt-5">
							<span>Пробег</span>
							<span className="flex-grow border-b border-dotted mx-2 mb-2"></span>
							<span className="font-bold">{Number(mileageState).toLocaleString('ru-RU')} км</span>
						</li>
					)}

				</ul>
			)}

		</div>
	);
}

export default AvtoInfoList;