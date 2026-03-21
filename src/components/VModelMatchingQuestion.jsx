import { useState, useCallback, useEffect } from "react";
import "./VModelMatchingQuestion.css";

function buildInitialVm(leftItems, pool) {
  const slots = {};
  leftItems.forEach((k) => {
    slots[k] = null;
  });
  return { slots, bank: [...pool] };
}

/**
 * V-모델: 왼쪽 개발 단계 고정, 오른쪽 테스트 단계를 드래그 또는 클릭으로 슬롯에 배치
 */
export default function VModelMatchingQuestion({ question, onSubmit }) {
  const leftItems = question.leftItems || [];

  const [vm, setVm] = useState(() => buildInitialVm(leftItems, question.rightPool || []));
  const [selectedFromBank, setSelectedFromBank] = useState(null);
  const [draggingLabel, setDraggingLabel] = useState(null);

  useEffect(() => {
    setVm(buildInitialVm(question.leftItems || [], question.rightPool || []));
    setSelectedFromBank(null);
    setDraggingLabel(null);
  }, [question.item?.id, question.leftItems, question.rightPool]);

  const assignSlot = useCallback((leftKey, label) => {
    if (!label) return;
    setVm(({ slots, bank }) => {
      const nextSlots = { ...slots };
      let nextBank = [...bank];
      const prevInSlot = nextSlots[leftKey];
      if (prevInSlot && prevInSlot !== label) {
        nextBank.push(prevInSlot);
      }
      Object.keys(nextSlots).forEach((k) => {
        if (nextSlots[k] === label) {
          nextSlots[k] = null;
        }
      });
      nextSlots[leftKey] = label;
      nextBank = nextBank.filter((x) => x !== label);
      return { slots: nextSlots, bank: nextBank };
    });
    setSelectedFromBank(null);
  }, []);

  const clearSlot = useCallback((leftKey) => {
    setVm(({ slots, bank }) => {
      const v = slots[leftKey];
      if (!v) return { slots, bank };
      const nextSlots = { ...slots, [leftKey]: null };
      const nextBank = bank.includes(v) ? bank : [...bank, v];
      return { slots: nextSlots, bank: nextBank };
    });
    setSelectedFromBank(null);
  }, []);

  const handleDropOnSlot = useCallback(
    (e, leftKey) => {
      e.preventDefault();
      const label = e.dataTransfer.getData("text/plain") || draggingLabel;
      if (label) assignSlot(leftKey, label);
      setDraggingLabel(null);
    },
    [assignSlot, draggingLabel]
  );

  const handleDragStartChip = useCallback((e, label) => {
    e.dataTransfer.setData("text/plain", label);
    e.dataTransfer.effectAllowed = "move";
    setDraggingLabel(label);
  }, []);

  const handleSlotClick = useCallback(
    (leftKey) => {
      if (selectedFromBank) {
        assignSlot(leftKey, selectedFromBank);
        return;
      }
      clearSlot(leftKey);
    },
    [selectedFromBank, assignSlot, clearSlot]
  );

  const handleBankChipClick = useCallback((label) => {
    setSelectedFromBank((s) => (s === label ? null : label));
  }, []);

  const { slots, bank } = vm;
  const allFilled = leftItems.every((k) => slots[k]);

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!allFilled) return;
    onSubmit({ ...slots });
  };

  return (
    <div className="question-card vmodel-matching">
      <div className="question-prompt">
        <p className="question-text">{question.question}</p>
        <p className="question-hint vmodel-matching-hint">
          드래그하여 슬롯에 놓거나, 테스트 단계를 누른 뒤 빈 슬롯을 눌러 배치하세요. 슬롯만 누르면
          비웁니다.
        </p>
      </div>

      <div className="vmodel-layout">
        <div className="vmodel-column vmodel-left">
          <h4 className="vmodel-col-title">개발 단계</h4>
          {leftItems.map((leftKey) => (
            <div key={leftKey} className="vmodel-row">
              <div className="vmodel-left-label">{leftKey}</div>
              <div
                className={`vmodel-slot ${slots[leftKey] ? "filled" : "empty"} ${selectedFromBank && !slots[leftKey] ? "drop-ready" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnSlot(e, leftKey)}
                onClick={() => handleSlotClick(leftKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSlotClick(leftKey);
                  }
                }}
              >
                {slots[leftKey] || "— 여기에 연결 —"}
              </div>
            </div>
          ))}
        </div>

        <div className="vmodel-column vmodel-right">
          <h4 className="vmodel-col-title">테스트 단계 (이동)</h4>
          <div className="vmodel-bank">
            {bank.map((label) => (
              <button
                key={label}
                type="button"
                draggable
                className={`vmodel-chip ${selectedFromBank === label ? "selected" : ""}`}
                onDragStart={(e) => handleDragStartChip(e, label)}
                onDragEnd={() => setDraggingLabel(null)}
                onClick={() => handleBankChipClick(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form className="answer-form vmodel-submit-wrap" onSubmit={handleSubmitForm}>
        <button type="submit" disabled={!allFilled}>
          정답 확인
        </button>
      </form>
    </div>
  );
}
