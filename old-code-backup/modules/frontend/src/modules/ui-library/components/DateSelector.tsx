//gzc-ui\src\components\DateSelector.tsx
/// <reference types="react" />
import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type DateSelectorProps = {
    currentDate?: Date;
    setCurrentDate?: (date: Date) => void;
};

const DateSelector: React.FC<DateSelectorProps> = ({
    currentDate,
    setCurrentDate,
}) => {
    const [localDate, setLocalDate] = useState<Date | null>(
        currentDate ?? new Date()
    );

    const selectedDate = currentDate ?? localDate;
    const handleChange = (date: Date | null) => {
        if (!date) return;
        if (setCurrentDate) {
            setCurrentDate(date); // use app context handler
        } else {
            setLocalDate(date); // fallback to local state
        }
    };

    return (
        <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gzc-mid-black dark:text-gzc-light-grey">
                Valuation Date:
            </label>
            <DatePicker
                selected={selectedDate}
                onChange={handleChange}
                dateFormat="yyyy-MM-dd"
                className="rounded-md border px-2 py-1 text-sm text-gzc-mid-black dark:bg-gzc-mid-black dark:text-gzc-light-grey"
                maxDate={new Date()}
            />
        </div>
    );
};

export default DateSelector;
export type { DateSelectorProps };
