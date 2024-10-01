import './styles.scss';
function Loader() {
	return (
		<div class="fixed h-full w-full top-0 left-0 bg-white/50 flex items-center justify-center z-[1000]">
			<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
		</div>
	);
}

export default Loader;