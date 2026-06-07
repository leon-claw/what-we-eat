import { Flame, Heart, Utensils, WalletCards, X } from "lucide-react";
import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { Direction, Stack, type DirectionValue, type SwingCard } from "swing";
import type { FoodOption, VoteChoice } from "../types";

type DishCardProps = {
  dish: FoodOption;
  nextDishes?: FoodOption[];
  onVote: (choice: VoteChoice) => void;
};

type ThrowState = {
  choice: VoteChoice | null;
  confidence: number;
};

function spiceLabel(level: NonNullable<FoodOption["spicyLevel"]>) {
  if (level === 0) return "不辣";
  return `${"辣".repeat(level)}`;
}

function priceLabel(level: NonNullable<FoodOption["priceLevel"]>) {
  return "¥".repeat(level);
}

function choiceFromDirection(direction?: DirectionValue): VoteChoice | null {
  if (direction === Direction.RIGHT) return "like";
  if (direction === Direction.LEFT) return "pass";
  return null;
}

const DishCardContent = memo(function DishCardContent({
  dish,
}: {
  dish: FoodOption;
}) {
  const [imageBroken, setImageBroken] = useState(false);

  useEffect(() => {
    setImageBroken(false);
  }, [dish.id]);

  return (
    <>
      <div className="dish-image-frame">
        {dish.imageUrl && !imageBroken ? (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            draggable={false}
            decoding="async"
            onError={() => setImageBroken(true)}
          />
        ) : (
          <div className="dish-image-fallback" aria-label={`${dish.name} 图片占位`}>
            <Utensils size={56} />
          </div>
        )}
      </div>

      <div className="dish-card-body">
        <div className="dish-title-row">
          <div>
            <p className="eyebrow">{dish.path.join(" · ")}</p>
            <h2>{dish.name}</h2>
          </div>
        </div>

        <p className="dish-description">{dish.description}</p>

        {dish.spicyLevel !== undefined || dish.priceLevel !== undefined ? (
          <div className="dish-meta-row" aria-label="菜品信息">
            {dish.spicyLevel !== undefined ? (
              <span title="辣度">
                <Flame size={16} />
                {spiceLabel(dish.spicyLevel)}
              </span>
            ) : null}
            {dish.priceLevel !== undefined ? (
              <span title="价格">
                <WalletCards size={16} />
                {priceLabel(dish.priceLevel)}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="tag-row">
          {dish.tags.slice(0, 4).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </>
  );
});

const buttonThrowMs = 460;

export default function DishCard({ dish, nextDishes = [], onVote }: DishCardProps) {
  const cardElementRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<SwingCard | null>(null);
  const selectedChoiceRef = useRef<VoteChoice | null>(null);
  const completedRef = useRef(false);
  const voteTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingThrowStateRef = useRef<ThrowState>({
    choice: null,
    confidence: 0,
  });
  const [buttonThrowChoice, setButtonThrowChoice] = useState<VoteChoice | null>(null);

  useEffect(() => {
    const element = cardElementRef.current;
    if (!element) return;

    element.style.transform = "";
    element.dataset.choice = "idle";
    element.style.setProperty("--throw-confidence", "0");
    setButtonThrowChoice(null);
    selectedChoiceRef.current = null;
    completedRef.current = false;

    const applyThrowState = (state: ThrowState) => {
      element.dataset.choice = state.choice ?? "idle";
      element.style.setProperty("--throw-confidence", String(state.confidence));
    };

    const scheduleThrowState = (state: ThrowState) => {
      pendingThrowStateRef.current = state;
      if (rafRef.current !== null) return;

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        applyThrowState(pendingThrowStateRef.current);
      });
    };

    const completeVote = () => {
      if (completedRef.current || !selectedChoiceRef.current) return;
      if (voteTimerRef.current) {
        window.clearTimeout(voteTimerRef.current);
        voteTimerRef.current = null;
      }
      completedRef.current = true;
      onVote(selectedChoiceRef.current);
    };

    const stack = Stack({
      allowedDirections: [Direction.LEFT, Direction.RIGHT],
      maxRotation: 24,
      minThrowOutDistance: Math.max(window.innerWidth, 420),
      maxThrowOutDistance: Math.max(window.innerWidth + 180, 620),
      isThrowOut: (_xOffset, _yOffset, _element, confidence) => confidence > 0.36,
      throwOutConfidence: (xOffset, _yOffset, targetElement) =>
        Math.min(Math.abs(xOffset) / (targetElement.offsetWidth * 0.72), 1),
    });

    const card = stack.createCard(element);
    cardRef.current = card;

    card.on("dragmove", (event) => {
      const choice = choiceFromDirection(event.throwDirection);
      scheduleThrowState({
        choice,
        confidence: event.throwOutConfidence ?? 0,
      });
    });

    card.on("throwin", () => {
      selectedChoiceRef.current = null;
      scheduleThrowState({ choice: null, confidence: 0 });
    });

    card.on("throwout", (event) => {
      selectedChoiceRef.current = choiceFromDirection(event.throwDirection);
      scheduleThrowState({
        choice: selectedChoiceRef.current,
        confidence: 1,
      });

      voteTimerRef.current = window.setTimeout(completeVote, buttonThrowMs);
    });

    card.on("throwoutend", completeVote);

    return () => {
      if (voteTimerRef.current) {
        window.clearTimeout(voteTimerRef.current);
        voteTimerRef.current = null;
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      card.destroy();
      cardRef.current = null;
    };
  }, [dish.id, onVote]);

  const throwCard = (choice: VoteChoice) => {
    const element = cardElementRef.current;
    if (!cardRef.current || !element || completedRef.current) return;

    selectedChoiceRef.current = choice;
    completedRef.current = true;
    element.dataset.choice = choice;
    element.style.setProperty("--throw-confidence", "1");
    setButtonThrowChoice(choice);
    voteTimerRef.current = window.setTimeout(() => {
      voteTimerRef.current = null;
      onVote(choice);
    }, buttonThrowMs);
  };

  const confidenceStyle = {
    "--throw-confidence": "0",
  } as CSSProperties;

  return (
    <section className="swipe-card-shell">
      <div className="swing-stack">
        {nextDishes.slice(0, 2).map((nextDish, index) => (
          <article
            className={`dish-card dish-card-preview preview-layer-${index + 1}`}
            key={nextDish.id}
            aria-hidden="true"
          >
            <DishCardContent dish={nextDish} />
          </article>
        ))}

        <article
          className="dish-card dish-card-active"
          key={dish.id}
          data-choice="idle"
          data-button-throw={buttonThrowChoice ?? "idle"}
          ref={cardElementRef}
          style={confidenceStyle}
        >
          <div className="dish-card-active-lift">
            <div className="choice-badge choice-badge-like">
              想吃
            </div>
            <div className="choice-badge choice-badge-pass">
              不想吃
            </div>
            <DishCardContent dish={dish} />
          </div>
        </article>
      </div>

      <div className="swipe-actions">
        <button
          className="round-action pass-action"
          type="button"
          onClick={() => throwCard("pass")}
          title="不想吃"
          aria-label={`不想吃 ${dish.name}`}
        >
          <X size={28} />
        </button>
        <button
          className="round-action like-action"
          type="button"
          onClick={() => throwCard("like")}
          title="想吃"
          aria-label={`喜欢 ${dish.name}`}
        >
          <Heart size={28} />
        </button>
      </div>
    </section>
  );
}
