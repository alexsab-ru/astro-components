import AvtoInfoList from './InfoList';
import AvtoInfoForm from './InfoForm';

function AvtoInfo() {
	return (
		<div className="border-t border-t-gray-400">
			<div className="flex flex-col lg:flex-row">
				<AvtoInfoList />
				<AvtoInfoForm />
			</div>
		</div>
	);
}

export default AvtoInfo;