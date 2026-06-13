import { useState } from "react";
import { registerUser } from "../features/users/userApi";
import type {
    RegisteredUser,
    RegisterUserInput,
    UserPlan,
} from "../features/users/userTypes";
import "./AccountRegistrationScreen.css";

type AccountRegistrationScreenProps = {
    onRegistered: (user: RegisteredUser) => void;
};

type RegistrationStep = "welcome" | "basic" | "shipping";

const planOptions: {
    id: UserPlan;
    name: string;
    price: string;
    description: string;
}[] = [
    {
        id: "free",
        name: "Free",
        price: "¥0/月",
        description: "直接交換だけ使う",
    },
    {
        id: "lite",
        name: "Lite",
        price: "¥980/月",
        description: "月3点まで倉庫OK",
    },
    {
        id: "plus",
        name: "Plus",
        price: "¥2,480/月",
        description: "月10点まで倉庫OK",
    },
];

function AccountRegistrationScreen({ onRegistered }: AccountRegistrationScreenProps) {
    const [step, setStep] = useState<RegistrationStep>("welcome");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [prefectureCity, setPrefectureCity] = useState("");
    const [addressLine, setAddressLine] = useState("");
    const [building, setBuilding] = useState("");
    const [plan, setPlan] = useState<UserPlan>("lite");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const hasValidBasicInfo =
        username.trim() !== "" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
        password.length >= 8;
    const hasValidShipping =
        postalCode.trim() !== "" &&
        prefectureCity.trim() !== "" &&
        addressLine.trim() !== "";

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!hasValidBasicInfo || !hasValidShipping || isSubmitting) return;

        setIsSubmitting(true);
        setErrorMessage("");

        const input: RegisterUserInput = {
            username: username.trim(),
            email: email.trim(),
            password,
            plan,
            shippingAddress: {
                postalCode: postalCode.trim(),
                prefectureCity: prefectureCity.trim(),
                addressLine: addressLine.trim(),
                building: building.trim() || undefined,
            },
        };

        try {
            const user = await registerUser(input);
            onRegistered(user);
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : "ユーザー登録に失敗しました"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="account-registration-screen">
            <div className="account-registration-screen__marks" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
            </div>

            {step === "welcome" && (
                <div className="account-registration-welcome">
                    <div className="account-registration-welcome__copy">
                        <p className="account-registration-screen__eyebrow">
                            若者のための交換アプリ
                        </p>
                        <h1>わらしべ</h1>
                        <p>
                            いらないモノが、誰かのほしいモノに。交換とAI提案を安心して使うために、まずはアカウントを作成します。
                        </p>
                    </div>

                    <div className="account-benefit-grid">
                        <article>
                            <span>↔</span>
                            <h2>直接交換</h2>
                            <p>ユーザー同士でそのまま交換</p>
                        </article>
                        <article>
                            <span>✦</span>
                            <h2>AI提案</h2>
                            <p>欲しいモノへの道筋を提案</p>
                        </article>
                        <article>
                            <span>□</span>
                            <h2>倉庫保管</h2>
                            <p>預けて、探して、つないでくれる</p>
                        </article>
                    </div>

                    <button
                        className="account-registration-screen__primary"
                        onClick={() => setStep("basic")}
                        type="button"
                    >
                        アカウント作成
                    </button>
                </div>
            )}

            {step !== "welcome" && (
                <form className="account-registration-form" onSubmit={handleSubmit}>
                    <div className="account-registration-form__top">
                        <button
                            aria-label="前のステップへ戻る"
                            className="account-registration-form__back"
                            onClick={() => setStep(step === "shipping" ? "basic" : "welcome")}
                            type="button"
                        >
                            ←
                        </button>
                        <div>
                            <p className="account-registration-screen__eyebrow">
                                登録は3ステップ
                            </p>
                            <h1>{step === "basic" ? "基本情報" : "配送先とプラン"}</h1>
                        </div>
                    </div>

                    <div className="account-registration-stepper" aria-label="登録ステップ">
                        <span className="account-registration-stepper__dot account-registration-stepper__dot--done">
                            1
                        </span>
                        <span
                            className={
                                step === "basic"
                                    ? "account-registration-stepper__line"
                                    : "account-registration-stepper__line account-registration-stepper__line--active"
                            }
                        />
                        <span
                            className={
                                step === "basic"
                                    ? "account-registration-stepper__dot account-registration-stepper__dot--active"
                                    : "account-registration-stepper__dot account-registration-stepper__dot--done"
                            }
                        >
                            2
                        </span>
                        <span
                            className={
                                step === "shipping"
                                    ? "account-registration-stepper__line account-registration-stepper__line--active"
                                    : "account-registration-stepper__line"
                            }
                        />
                        <span
                            className={
                                step === "shipping"
                                    ? "account-registration-stepper__dot account-registration-stepper__dot--active"
                                    : "account-registration-stepper__dot"
                            }
                        >
                            3
                        </span>
                    </div>

                    {step === "basic" && (
                        <div className="account-registration-form__fields">
                            <label>
                                <span>ユーザー名</span>
                                <input
                                    autoComplete="username"
                                    onChange={(event) => setUsername(event.target.value)}
                                    placeholder="例）haru_03"
                                    type="text"
                                    value={username}
                                />
                            </label>
                            <label>
                                <span>メール</span>
                                <input
                                    autoComplete="email"
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="例）haru@example.com"
                                    type="email"
                                    value={email}
                                />
                            </label>
                            <label>
                                <span>パスワード</span>
                                <input
                                    autoComplete="new-password"
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="8文字以上"
                                    type="password"
                                    value={password}
                                />
                            </label>

                            <button
                                className="account-registration-screen__primary"
                                disabled={!hasValidBasicInfo}
                                onClick={() => setStep("shipping")}
                                type="button"
                            >
                                次へ
                            </button>
                        </div>
                    )}

                    {step === "shipping" && (
                        <div className="account-registration-form__fields">
                            <div className="account-registration-address">
                                <label>
                                    <span>郵便番号</span>
                                    <input
                                        inputMode="numeric"
                                        onChange={(event) => setPostalCode(event.target.value)}
                                        placeholder="例）150-0001"
                                        type="text"
                                        value={postalCode}
                                    />
                                </label>
                                <label>
                                    <span>都道府県・市区町村</span>
                                    <input
                                        onChange={(event) => setPrefectureCity(event.target.value)}
                                        placeholder="例）東京都渋谷区"
                                        type="text"
                                        value={prefectureCity}
                                    />
                                </label>
                                <label>
                                    <span>番地</span>
                                    <input
                                        onChange={(event) => setAddressLine(event.target.value)}
                                        placeholder="例）神宮前1-2-3"
                                        type="text"
                                        value={addressLine}
                                    />
                                </label>
                                <label>
                                    <span>建物名・部屋番号</span>
                                    <input
                                        onChange={(event) => setBuilding(event.target.value)}
                                        placeholder="例）はるビル101"
                                        type="text"
                                        value={building}
                                    />
                                </label>
                            </div>

                            <div>
                                <p className="account-registration-form__label">プラン</p>
                                <div className="account-plan-grid">
                                    {planOptions.map((option) => (
                                        <button
                                            className={
                                                plan === option.id
                                                    ? "account-plan-card account-plan-card--active"
                                                    : "account-plan-card"
                                            }
                                            key={option.id}
                                            onClick={() => setPlan(option.id)}
                                            type="button"
                                        >
                                            <span>{option.name}</span>
                                            <strong>{option.price}</strong>
                                            <p>{option.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {errorMessage && (
                                <p className="account-registration-form__error">
                                    {errorMessage}
                                </p>
                            )}

                            <button
                                className="account-registration-screen__primary"
                                disabled={!hasValidShipping || isSubmitting}
                                type="submit"
                            >
                                {isSubmitting ? "登録中..." : "はじめる"}
                            </button>
                        </div>
                    )}
                </form>
            )}
        </section>
    );
}

export default AccountRegistrationScreen;
