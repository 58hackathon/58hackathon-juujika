import { useState } from "react";
import { createItem } from "../features/items/itemApi";
import type { RegisteredUser } from "../features/users/userTypes";
import "./CreateItemScreen.css";

type CreateItemScreenProps = {
    currentUser: RegisteredUser;
    onItemCreated: () => void;
};

function CreateItemScreen({ currentUser, onItemCreated }: CreateItemScreenProps) {
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [itemName, setItemName] = useState("");
    const [category, setCategory] = useState("");
    const [condition, setCondition] = useState("");
    const [price, setPrice] = useState("");
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setPhotoUrl(imageUrl);
    };
    const wantedOptions = [
    "ファッション",
    "バッグ",
    "家電",
    "クーポン",
    "本・教材",
    "その他",
    "なんでもOK!",
    ];  
    const [selectedWantedItems, setSelectedWantedItems] = useState<string[]>([]);
    const handleWantedToggle = (wantedItem: string) => {
        if (wantedItem === "なんでもOK!") {
            setSelectedWantedItems(["なんでもOK!"]);
            return;
        }


        const withoutAnythingOk = selectedWantedItems.filter(
            (item) => item !== "なんでもOK!"
        );

        if (withoutAnythingOk.includes(wantedItem)) {
            setSelectedWantedItems(
            withoutAnythingOk.filter((item) => item !== wantedItem)
            );
            return;
        }

        setSelectedWantedItems([...withoutAnythingOk, wantedItem]);
        };

    const hasPhoto = photoUrl !== null;
    const priceNumber = Number(price);
    const hasValidPrice =
        price.trim() !== "" && Number.isInteger(priceNumber) && priceNumber > 0;
    const hasBasicInfo =
        itemName.trim() !== "" &&
        category !== "" &&
        condition !== "" &&
        hasValidPrice &&
        comment.trim() !== "";
    const hasWantedItems = selectedWantedItems.length > 0;
    const isReadyToSubmit = hasPhoto && hasBasicInfo && hasWantedItems;
    const activeStep = isComplete
        ? 4
        : hasPhoto
            ? hasBasicInfo
                ? hasWantedItems
                    ? 4
                    : 3
                : 2
            : 1;

    const getStepClassName = (step: number) => {
        const classNames = ["create-stepper__item"];

        if (activeStep === step) {
            classNames.push("create-stepper__item--active");
        }

        if (isComplete || activeStep > step) {
            classNames.push("create-stepper__item--done");
        }

        return classNames.join(" ");
    };

    const getStepNumber = (step: number) => {
        return isComplete || activeStep > step ? "✓" : step;
    };

    const getLineClassName = (step: number) => {
        return activeStep > step || isComplete
            ? "create-stepper__line create-stepper__line--active"
            : "create-stepper__line";
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isReadyToSubmit || isSubmitting) return;

        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);

        await createItem({
            title: String(formData.get("itemName") ?? ""),
            category: String(formData.get("category") ?? ""),
            ownerId: currentUser.id,
            ownerName: currentUser.username,
            price: priceNumber,
            description: String(formData.get("comment") ?? ""),
            wantedItem: selectedWantedItems.join("、"),
            imageUrl: photoUrl ?? "/images/demo/generated/reading-card-500.png",
        });

        setIsComplete(true);
        setIsSubmitting(false);
    };
    return (
        <section className="create-item-screen">
            <header className="create-item-screen__header">商品を出品する</header>

            <div className="create-stepper">
                <div className={getStepClassName(1)}>
                    <span className="create-stepper__number">{getStepNumber(1)}</span>
                    <span className="create-stepper__label">写真</span>
                </div>

                <div className={getLineClassName(1)} />

                <div className={getStepClassName(2)}>
                    <span className="create-stepper__number">{getStepNumber(2)}</span>
                    <span className="create-stepper__label">情報入力</span>
                </div>

                <div className={getLineClassName(2)} />

                <div className={getStepClassName(3)}>
                    <span className="create-stepper__number">{getStepNumber(3)}</span>
                    <span className="create-stepper__label">交換希望</span>
                </div>

                <div className={getLineClassName(3)} />

                <div className={getStepClassName(4)}>
                    <span className="create-stepper__number">{getStepNumber(4)}</span>
                    <span className="create-stepper__label">確認</span>
                </div>
            </div>

            <div className="create-item-form__photo-section">
                
                <div className="create-item-form__photo-grid">
                    <label className="create-item-form__photo-add" htmlFor="itemPhoto">
                        {photoUrl ? (
                            <img
                            className="create-item-form__photo-preview"
                            src={photoUrl}
                            alt="選択した商品画像"
                            />
                        ) : (
                            <span className="create-item-form__photo-plus">+</span>
                        )}
                    </label>

                    <input
                    className="create-item-form__photo-input"
                    id="itemPhoto"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    />

                    <div className="create-item-form__photo-slot" />
                    <div className="create-item-form__photo-slot" />
                    <div className="create-item-form__photo-slot" />
                </div>
            
            <form className="create-item-form__description" onSubmit={handleSubmit}>

                <div className="create-item-form__field">
                    <label className="create-item-form__label" htmlFor="itemName">
                        商品名
                    </label>
                    <input
                        className="create-item-form__input"
                        id="itemName"
                        name="itemName"
                        onChange={(event) => setItemName(event.target.value)}
                        type="text"
                        value={itemName}
                        placeholder="例）NEW ERA リュック"
                    />
                </div>

                <div className="create-item-form__field">
                    <label className="create-item-form__label" htmlFor="category">
                        カテゴリ
                    </label>
                    <select
                        className="create-item-form__select"
                        id="category"
                        name="category"
                        onChange={(event) => setCategory(event.target.value)}
                        value={category}
                    >
                        <option value="">選択してください</option>
                        <option value="ファッション">ファッション</option>
                        <option value="バッグ">バッグ</option>
                        <option value="家電">家電</option>
                        <option value="クーポン">クーポン</option>
                        <option value="本・教材">本・教材</option>
                        <option value="その他">その他</option>
                    </select>
                </div>

                <div className="create-item-form__field">
                    <label className="create-item-form__label" htmlFor="condition">
                        商品の状態
                    </label>
                    <select
                        className="create-item-form__select"
                        id="condition"
                        name="condition"
                        onChange={(event) => setCondition(event.target.value)}
                        value={condition}
                    >
                        <option value="">選択してください</option>
                        <option value="新品未使用">新品未使用</option>
                        <option value="未使用に近い">未使用に近い</option>
                        <option value="目立った汚れなし">目立った汚れなし</option>
                        <option value="目立った傷や汚れなし">目立った傷や汚れなし</option>
                        <option value="やや傷や汚れあり">やや傷や汚れあり</option>
                        <option value="使用感あり">使用感あり</option>
                    </select>
                </div>

                <div className="create-item-form__field">
                    <label className="create-item-form__label" htmlFor="price">
                        価格
                    </label>
                    <input
                        className="create-item-form__input"
                        id="price"
                        inputMode="numeric"
                        min="1"
                        name="price"
                        onChange={(event) => setPrice(event.target.value)}
                        placeholder="例）2500"
                        step="1"
                        type="number"
                        value={price}
                    />
                </div>

                <div className="create-item-form__field">
                    <p className="create-item-form__label">
                        交換で欲しいもの
                    </p>

                    <div className="create-item-form__wanted-tags">
                        {wantedOptions.map((wantedItem) => (
                        <button
                            className={
                            selectedWantedItems.includes(wantedItem)
                                ? "create-item-form__wanted-tag create-item-form__wanted-tag--active"
                                : "create-item-form__wanted-tag"
                            }
                            key={wantedItem}
                            onClick={() => handleWantedToggle(wantedItem)}
                            type="button"
                        >
                            {wantedItem}
                        </button>
                        ))}
                    </div>
                </div>


                <div className="create-item-form__field">
                    <label className="create-item-form__label" htmlFor="comment">
                        コメント
                    </label>
                    <textarea
                        className="create-item-form__textarea"
                        id="comment"
                        name="comment"
                        onChange={(event) => setComment(event.target.value)}
                        placeholder="商品の状態や交換したい理由を書いてください"
                        value={comment}
                    />
                </div>

                
                <button
                    className="create-item-form__submit"
                    disabled={!isReadyToSubmit || isSubmitting}
                    type="submit"
                >
                    {isSubmitting ? "出品中..." : "出品する"}
                </button>
                
            </form>
</div>

            {isComplete && (
                <div className="create-complete" role="dialog" aria-modal="true" aria-labelledby="createCompleteTitle">
                    <div className="create-complete__sheet">
                        <div className="create-complete__handle" />

                        <div className="create-complete__summary">
                            <div className="create-complete__image-wrap">
                                {photoUrl ? (
                                    <img src={photoUrl} alt="" />
                                ) : (
                                    <span className="create-complete__image-fallback" />
                                )}
                            </div>

                            <div>
                                <p className="create-complete__badge">出品完了</p>
                                <h2 id="createCompleteTitle">{itemName}</h2>
                                <p className="create-complete__message">
                                    商品一覧に反映されました
                                </p>
                            </div>
                        </div>

                        <button
                            className="create-complete__primary"
                            onClick={onItemCreated}
                            type="button"
                        >
                            商品一覧へ
                        </button>
                    </div>
                </div>
            )}


        </section>
    )
}
export default CreateItemScreen;
