import type { Item } from "../features/items/itemTypes";
import "./ItemDetailScreen.css";

type ItemDetailScreenProps = {
    item: Item;
    onBack: () => void;
};

function ItemDetailScreen({ item, onBack }: ItemDetailScreenProps) {
    return (
        <section className="item-detail-screen">
            <button className="item-detail-screen__back" onClick={onBack} type="button">
                戻る
            </button>

            <img className="item-detail-screen__image" src={item.imageUrl} alt={item.title} />

            <div className="item-detail-screen__body">
                <p className="item-detail-screen__category">{item.category}</p>
                <h1>{item.title}</h1>
                <p className="item-detail-screen__price">¥{item.price.toLocaleString()}</p>
                <p>{item.description}</p>
                <p>希望: {item.wantedItem}</p>
                <p>出品者: {item.ownerName}</p>
            </div>
        </section>
    );
}

export default ItemDetailScreen;