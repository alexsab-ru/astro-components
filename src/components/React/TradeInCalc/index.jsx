import React, { useState } from 'react';
import VinForm from './VinForm';
import StepPanel from './StepPanel';

export default function TradeInCalc() {
	const [step, setStep] = useState(0);
	return ( 
		<div>
			<StepPanel step={step} />
			<VinForm />
		</div> 
	);
}