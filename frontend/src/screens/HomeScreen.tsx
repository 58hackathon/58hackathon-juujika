import ItemCard from "../components/ItemCard";
import { demoItems } from "../features/items/itemData";

function HomeScreen() {
    return (
        <section>
        {demoItems.map((item) => (
            <ItemCard key={item.id} item={item} />
        ))}
        </section>
    );
}
export default HomeScreen;