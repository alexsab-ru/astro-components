import React, { useState } from 'react';
import VinForm from './VinForm';
import StepPanel from './StepPanel';

export default function TradeInCalc() {
	return ( 
		<div>
			<StepPanel step={0} />
			<VinForm />
		</div> 
	);
}