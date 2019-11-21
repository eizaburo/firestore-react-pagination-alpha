import React from 'react';
import './App.css';
import { db } from './Firebase';
import moment from 'moment';

class App extends React.Component {

    state = {
        items: [],
        limit: 10,
        lastVisible: null,
        history: [],
        keyword: '',
    }

    componentDidMount = async () => {
        this.getData();
    }

    getData = async () => {

        let initialQuery = null;
        if (this.state.keyword === '') {
            initialQuery = db.collection('members')
                .orderBy('id', 'asc')
                .limit(this.state.limit);
        } else {
            initialQuery = db.collection('members')
                .where('keywords', 'array-contains-any', [this.state.keyword])
                .orderBy('id', 'asc')
                .limit(this.state.limit);
        }

        const snapshot = await initialQuery.get();

        const docs = snapshot.docs.map(doc => doc.data());

        //ページが無いとき何もしない
        if (docs.length < 1) {
            this.setState({ items: [] }); //いちおうから配列を返す（ヒット無しだから）
            return null;
        }

        const lastVisible = docs[docs.length - 1].id;
        const startVisible = docs[0].id;

        const _history = [...this.state.history];
        _history.push(startVisible);

        this.setState({
            items: docs,
            lastVisible: lastVisible,
            history: _history,
        });

    }

    getNexteData = async () => {

        let nextQuery = null;
        if (this.state.keyword === '') {
            nextQuery = db.collection('members')
                .orderBy('id', 'asc')
                .startAfter(this.state.lastVisible)
                .limit(this.state.limit);
        } else {
            nextQuery = db.collection('members')
                .where('keywords', 'array-contains-any', [this.state.keyword])
                .orderBy('id', 'asc')
                .startAfter(this.state.lastVisible)
                .limit(this.state.limit);
        }

        const snapshot = await nextQuery.get();

        const docs = snapshot.docs.map(doc => doc.data());

        //ページが無いとき何もしない
        if (docs.length < 1) {
            return null;
        }

        const lastVisible = docs[docs.length - 1].id;
        const startVisible = docs[0].id;

        const _history = [...this.state.history];
        _history.push(startVisible);

        this.setState({
            items: docs,
            lastVisible: lastVisible,
            history: _history,
        });
    }

    getPrevData = async () => {

        //historyが無いと何もしない
        if (this.state.history.length <= 1) {
            return null;
        }

        let prevQuery = null;
        if (this.state.keyword === '') {
            prevQuery = db.collection('members')
                .orderBy('id', 'asc')
                .startAt(this.state.history[this.state.history.length - 2])
                .limit(this.state.limit);
        } else {
            prevQuery = db.collection('members')
                .where('keywords', 'array-contains-any', [this.state.keyword])
                .orderBy('id', 'asc')
                .startAt(this.state.history[this.state.history.length - 2])
                .limit(this.state.limit);
        }

        const snapshot = await prevQuery.get();

        const docs = snapshot.docs.map(doc => doc.data());

        //ページが無いとき何もしない
        if (docs.length < 1) {
            return null;
        }

        const lastVisible = docs[docs.length - 1].id;

        const _history = [...this.state.history];
        _history.pop();

        this.setState({
            items: docs,
            lastVisible: lastVisible,
            history: _history,
        });
    }

    handleNext = () => {
        this.getNexteData();
    }

    handlePrev = () => {
        this.getPrevData();
    }

    changeText = (e) => {
        this.setState({ keyword: e.target.value });
        this.setState({ history: [] }); //検索ワードが変化したらhistoryも一度リセット
    }

    handleSearch = async () => {
        const keyword = this.state.keyword;
        await this.setState({ keyword: keyword })
        await this.getData();
    }

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
