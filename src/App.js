import React from 'react';
import './App.css';
import { db } from './Firebase';
import moment from 'moment';

class App extends React.Component {

    state = {
        items: [], //検索結果
        limit: 10, //ページ行数
        lastVisible: null, //マイページの最後の行（object）
        history: [], //ページ遷移履歴
        keyword: '', //検索キーワード
    }

    componentDidMount = async () => {
        //初期データ取得
        this.getData();
    }

    //初期データ取得用
    getData = async () => {

        let initialQuery = null;
        //検索するしないでクエリを分岐
        if (this.state.keyword === '') {
            initialQuery = db.collection('members')
                .orderBy('createdAt', 'desc')
                .limit(this.state.limit);
        } else {
            initialQuery = db.collection('members')
                .where('keywords', 'array-contains-any', [this.state.keyword])
                .orderBy('createdAt', 'desc')
                .limit(this.state.limit);
        }

        //取得
        const snapshot = await initialQuery.get();

        //何もヒットしなかったら
        if (snapshot.docs.length < 1) {
            this.setState({ items: [] }); //いちおうから配列を返す（ヒット無しだから）
            return null;
        }

        //各行を取得
        const docs = snapshot.docs.map(doc => doc.data());

        //最後の表示オブジェクト
        const lastVisible = snapshot.docs[docs.length - 1];
        //最初の表示部ジェクト
        const startVisible = snapshot.docs[0];

        //最初を履歴にpush（戻り先の管理）
        const _history = [...this.state.history];
        _history.push(startVisible);

        //state更新
        this.setState({
            items: docs,
            lastVisible: lastVisible,
            history: _history,
        });

    }

    //Nextページデータ取得用
    getNexteData = async () => {

        let nextQuery = null;
        //検索するしないでクエリを分岐
        if (this.state.keyword === '') {
            nextQuery = db.collection('members')
                .orderBy('createdAt', 'desc')
                .startAfter(this.state.lastVisible) //前の最後の次から取得
                .limit(this.state.limit);
        } else {
            nextQuery = db.collection('members')
                .where('keywords', 'array-contains-any', [this.state.keyword])
                .orderBy('createdAt', 'desc')
                .startAfter(this.state.lastVisible) //前の最後の次から取得
                .limit(this.state.limit);
        }

        const snapshot = await nextQuery.get();

        //何もヒットしなかったら
        if (snapshot.docs.length < 1) {
            return null;
        }

        //各行取得
        const docs = snapshot.docs.map(doc => doc.data());

        //最後のオブジェクト（値ではなくオブジェクトを記録する）
        const lastVisible = snapshot.docs[docs.length - 1];
        //最初のオブジェクト
        const startVisible = snapshot.docs[0];

        //履歴に追加
        const _history = [...this.state.history];
        _history.push(startVisible);

        //state更新
        this.setState({
            items: docs,
            lastVisible: lastVisible,
            history: _history,
        });
    }

    getPrevData = async () => {

        //historyが無いと何もしない（戻りすぎエラー防止）
        if (this.state.history.length <= 1) {
            return null;
        }

        let prevQuery = null;
        //検索するしないでクエリを分岐
        if (this.state.keyword === '') {
            prevQuery = db.collection('members')
                .orderBy('createdAt', 'desc')
                .startAt(this.state.history[this.state.history.length - 2])
                .limit(this.state.limit);
        } else {
            prevQuery = db.collection('members')
                .where('keywords', 'array-contains-any', [this.state.keyword])
                .orderBy('createdAt', 'desc')
                .startAt(this.state.history[this.state.history.length - 2])
                .limit(this.state.limit);
        }

        //取得
        const snapshot = await prevQuery.get();

        //何もヒットしなかったら
        if (snapshot.docs.length < 1) {
            return null;
        }

        //各行取得
        const docs = snapshot.docs.map(doc => doc.data());

        //最後のオブジェクト
        const lastVisible = snapshot.docs[docs.length - 1];
        //最新の履歴を1つ削除
        const _history = [...this.state.history];
        _history.pop();

        //state更新
        this.setState({
            items: docs,
            lastVisible: lastVisible,
            history: _history,
        });
    }

    //次へリンクが押されたら
    handleNext = () => {
        this.getNexteData();
    }

    //戻るリンクが押されたら
    handlePrev = () => {
        this.getPrevData();
    }

    //検索input変更対応
    changeText = (e) => {
        this.setState({ keyword: e.target.value });
        this.setState({ history: [] }); //検索ワードが変化したらhistoryも一度リセット
    }

    //検索ボタンが押されたら
    handleSearch = async () => {
        const keyword = this.state.keyword;
        await this.setState({ keyword: keyword })
        await this.getData();
    }

    //リセットボタンが押されたら
    handleReset = async () => {
        await this.setState({ keyword: '' });
        await this.getData();
    }

    render() {
        // console.log(this.state);
        return (
            <div>
                <h3>Pagination sample.</h3>
                <div style={{ margin: 20 }}>
                    keyword:<input type="text" name="keyword" value={this.state.keyword} onChange={this.changeText} />
                    <button onClick={this.handleSearch}>検索</button>
                    <button onClick={this.handleReset}>リセット</button>
                </div>
                <table border="1">
                    <tbody>
                        {
                            this.state.items.map(doc => (
                                <tr key={doc.docId}>
                                    <td>{doc.id}</td>
                                    <td>{doc.docId}</td>
                                    <td>{doc.name}</td>
                                    <td>{doc.age}</td>
                                    <td>{doc.address}</td>
                                    <td>{moment(doc.createdAt.seconds * 1000).format('YYYY-MM-DD HH:mm:ss')}</td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
                <div style={{ display: 'flex' }}>
                    <p style={{ margin: 20, cursor: 'pointer' }} onClick={() => this.handlePrev()}>戻る</p>
                    <p style={{ margin: 20, cursor: 'pointer' }} onClick={() => this.handleNext()}>次へ</p>
                </div>
            </div>
        );
    }
}

export default App;
