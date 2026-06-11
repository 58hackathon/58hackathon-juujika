import { useState } from "react";
import "./CreateItemScreen.css";


function CreateItemScreen() {
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

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
    return (
        <section className="create-item-screen">
            <header className="create-item-screen__header">商品を出品する</header>

            <div className="create-stepper">
                <div className="create-stepper__item create-stepper__item--active">
                    <span className="create-stepper__number">1</span>
                    <span className="create-stepper__label">写真</span>
                </div>

                <div className="create-stepper__line" />

                <div className="create-stepper__item">
                    <span className="create-stepper__number">2</span>
                    <span className="create-stepper__label">情報入力</span>
                </div>

                <div className="create-stepper__line" />

                <div className="create-stepper__item">
                    <span className="create-stepper__number">3</span>
                    <span className="create-stepper__label">交換希望</span>
                </div>

                <div className="create-stepper__line" />

                <div className="create-stepper__item">
                    <span className="create-stepper__number">4</span>
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
            
            <div className="create-item-form__description">

                <div className="create-item-form__field">
                    <label className="create-item-form__label" htmlFor="itemName">
                        商品名
                    </label>
                    <input
                        className="create-item-form__input"
                        id="itemName"
                        name="itemName"
                        type="text"
                        placeholder="例）NEW ERA リュック"
                    />
                </div>

                <div className="create-item-form__field">
                    <label className="create-item-form__label" htmlFor="category">
                        カテゴリ
                    </label>
                    <select className="create-item-form__select" id="category" name="category">
                        <option value="">選択してください</option>
                        <option value="fashion">ファッション</option>
                        <option value="bag">バッグ</option>
                        <option value="electronics">家電</option>
                        <option value="coupon">クーポン</option>
                        <option value="book">本・教材</option>
                        <option value="other">その他</option>
                    </select>
                </div>

                <div className="create-item-form__field">
                    <label className="create-item-form__label" htmlFor="condition">
                        商品の状態
                    </label>
                    <select className="create-item-form__select" id="condition" name="condition">
                        <option value="">選択してください</option>
                        <option value="fashion">未使用に近い</option>
                        <option value="bag">目立った汚れなし</option>
                        <option value="electronics">目立った傷や汚れなし</option>
                        <option value="coupon">やや傷や汚れあり</option>
                        <option value="book">使用感あり</option>
                    </select>
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
                        placeholder="商品の状態や交換したい理由を書いてください"
                    />
                </div>

                
                <button className="create-item-form__submit">
                    出品する
                </button>
                
            </div>
</div>


        </section>
    )
}
export default CreateItemScreen;

