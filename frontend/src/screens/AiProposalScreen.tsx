import "./AiProposalScreen.css";

function AiProposalScreen() {
    return (
        <section className="ai-proposal-screen">
            <header className="ai-proposal-screen__header">
                <p className="ai-proposal-screen__eyebrow">交換提案AI</p>
                <h1>欲しいものまでの道筋を探す</h1>
                <p>
                    出品した商品と到達したい商品を選ぶと、AIが交換ルート候補を提案します。
                </p>
            </header>

            <div className="ai-proposal-board">
                <article className="ai-proposal-card ai-proposal-card--source">
                    <span>1</span>
                    <h2>出品した商品</h2>
                    <p>自分の商品を選択</p>
                </article>

                <div className="ai-proposal-arrow">→</div>

                <article className="ai-proposal-card ai-proposal-card--goal">
                    <span>2</span>
                    <h2>欲しい商品</h2>
                    <p>到達したい商品を選択</p>
                </article>
            </div>

            <section className="ai-proposal-preview">
                <div>
                    <p className="ai-proposal-preview__label">提案イメージ</p>
                    <h2>3ステップで成立しやすいルート</h2>
                    <p>価格差と相手の希望条件を見ながら、複数候補を比較します。</p>
                </div>
                <button type="button">準備中</button>
            </section>
        </section>
    );
}

export default AiProposalScreen;
