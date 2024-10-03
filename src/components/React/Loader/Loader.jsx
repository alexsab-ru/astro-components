import './styles.scss';
function Loader() {
	return (
		<div className="fixed h-full w-full top-0 left-0 bg-white/50 flex items-center justify-center z-[1000]">
			<div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
		</div>
	);
}

export default Loader;