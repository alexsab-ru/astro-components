import React, { useState } from 'react';
export default function VinForm() {
	return (
		<form className="mb-10 vue-form">
				<h3 className="text-2xl font-bold mb-6">Введите VIN-номер</h3>
			<div className="flex">
				<input
					type="text"
					className="w-[270px] border-2 transition-all focus:border-accent-500 px-4 py-2.5 outline-none text-black border-gray-100"
					placeholder="Введите VIN-номер"
					// :className="{ '!border-black !text-black': vin }"
				/>
				<button
					className="bg-black text-white w-[48px] h-[48px] m-0 flex justify-center items-center transition-opacity hover:bg-accent-400"
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
			{/* <show-errors
				:errors="v$.vin.$errors"
				v-if="v$.vin.$error && v$.vin.$errors.length"
			/> */}
		</form>
	);
}