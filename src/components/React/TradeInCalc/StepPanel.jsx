import { useCarInfo } from '@/store/useCarInfo';
import React, { useMemo } from 'react';

const steps = ['Ваш автомобиль', 'Характеристики вашего авто', 'Результаты оценки'];

// Компонент для отображения шагов
const StepPanel = () => {
  const {step, setStep, recalculate} = useCarInfo();

  const handleStepClick = (idx) => {
    if (step < idx || step === 0 || step === idx) return;
    if(idx === 0) { recalculate(); }
    setStep(idx);
  };

  const translateStyle = useMemo(() => ({
    transform: `translateX(-${step * 33.5}%)`,
  }), [step]);

  return (
    <div className="overflow-hidden pt-5">
      <div className="mb-12 flex flex-nowrap font-medium text-gray-500 w-[800px] md:w-auto md:!translate-x-0" style={translateStyle}>
        {steps.map((s, idx) => (
          <div
            key={idx}
            className={`relative md:flex-grow flex items-center gap-4 !pt-3 w-1/3 md:w-auto ${step === idx ? 'border-t-4 border-t-black' : step > idx ? 'border-t-4 border-t-greenBrand cursor-pointer' : 'border-t border-t-cd'}`}
            onClick={() => handleStepClick(idx)}
          >
            <span className={`font-medium ${step > idx ? 'text-greenBrand' : 'text-black'}`}>
              0{idx + 1}
            </span>
            <span className={`${step < idx ? '!text-gray-500' : 'text-black'}`}>
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepPanel;