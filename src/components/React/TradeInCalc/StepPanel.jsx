import React, { useContext, useMemo } from 'react';

// Контекст для управления шагами
const StepContext = React.createContext();

const steps = ['Ваш автомобиль', 'Характеристики вашего авто', 'Результаты оценки'];

// Компонент для отображения шагов
const StepComponent = () => {
  const { currentStep, setCurrentStep } = useContext(StepContext);

  const handleStepClick = (idx) => {
    if (currentStep < idx || currentStep === 0 || currentStep === idx) return;
    setCurrentStep((prev) => prev - 1);
  };

  const translateStyle = useMemo(() => ({
    transform: `translateX(-${currentStep * 33.5}%)`,
  }), [currentStep]);

  return (
    <div className="overflow-hidden pt-5">
      <div className="mb-12 flex flex-nowrap font-medium text-cd w-[800px] md:w-auto md:!translate-x-0" style={translateStyle}>
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`relative md:flex-grow flex items-center gap-4 !pt-3 w-1/3 md:w-auto 
              ${currentStep === idx ? 'border-t-4 border-t-black' : currentStep > idx ? 'border-t-4 border-t-greenBrand cursor-pointer' : 'border-t border-t-cd'}`}
            onClick={() => handleStepClick(idx)}
          >
            <span className={`font-bold ${currentStep > idx ? 'text-greenBrand' : 'text-black'}`}>
              0{idx + 1}
            </span>
            <span className={`${currentStep < idx ? '!text-cd' : 'text-black'}`}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Компонент, который содержит состояние шагов
const StepProvider = ({ step = 0, children }) => {
  const [currentStep, setCurrentStep] = React.useState(step);

  return (
    <StepContext.Provider value={{ currentStep, setCurrentStep }}>
      {children}
    </StepContext.Provider>
  );
};

const StepPanel = ({step}) => {
  return (
    <StepProvider step={step}>
      <StepComponent />
    </StepProvider>
  );
};

export default StepPanel;