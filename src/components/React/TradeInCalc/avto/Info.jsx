import AvtoInfoList from './InfoList';
import AvtoInfoForm from './InfoForm';

function AvtoInfo({ ct_routeKey = '' } = {}) {
	return (
		<div className="border-t border-t-gray-400">
			<div className="flex flex-col lg:flex-row">
				<AvtoInfoList />
				<AvtoInfoForm ct_routeKey={ct_routeKey} />
			</div>
		</div>
	);
}

export default AvtoInfo;