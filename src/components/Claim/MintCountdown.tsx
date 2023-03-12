import Countdown from 'react-countdown';

interface MintCountdownProps {
  date: Date | undefined;
  style?: React.CSSProperties;
  status?: string;
  onComplete?: () => void;
}

interface MintCountdownRender {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  completed: boolean;
}

export const MintCountdown: React.FC<MintCountdownProps> = ({
  date,
  status,
  style,
  onComplete,
}) => {
  const renderCountdown = ({
    days,
    hours,
    minutes,
    seconds,
    completed,
  }: MintCountdownRender) => {
    hours += days * 24;

    return null
    
    // if (completed) {
    //   return null;
    // } else {
    //   return (
    //     <button className="purchase-button" disabled>
    //       <span>
    //         {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    //       </span>
    //     </button>
    //   );
    // }
  };

  if (date) {
    return (
      <Countdown
        date={date}
        onComplete={onComplete}
        renderer={renderCountdown}
      />
    );
  } else {
    return null;
  }
};