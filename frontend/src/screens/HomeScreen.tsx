import ItemCard from "../components/ItemCard";
import { demoItems } from "../features/items/itemData";
import "./HomeScreen.css";
function HomeScreen() {
    return (
        <section className="home-screen">
        {demoItems.map((item) => (
            <ItemCard key={item.id} item={item} />
        ))}
        </section>
    );
}

export default HomeScreen;