import React from 'react';
import './App.css';
import { db } from './Firebase';
import moment from 'moment';

import { Table, Form, FormGroup, Label, Input, Button, Pagination, PaginationItem, PaginationLink } from 'reactstrap';

import { CSVLink } from 'react-csv';

class App extends React.Component {

    state = {
        items: [], //検索結果
        limit: 10,
        lastVisible: null,
        history: [],
        keyword: '',
        downloadItems: [], //ダウンロード対象データ
    }

    csvLink = React.createRef();

    componentDidMount = () => {
        this.getData();
    }

    //初期データ取得用
    getData = async () => {

        //クエリ
        let initialQuery = null;
        if (this.state.keyword === '') {
            initialQuery = db.collection('members')
                .orderBy('createdAt', 'desc')
                .limit(this.state.limit);
        } else {
            initialQuery = db.collection('members')
                .where('keywords', 'array-contains-any', [this.state.keyword]) //keywordで検索
                .orderBy('createdAt', 'desc')
                .limit(this.state.limit);
        }

        //取得
        const snapshot = await initialQuery.get();

        //各行を取得
        const docs = snapshot.docs.map(doc => doc.data());

        //最後の行（オブジェクトを記憶しておく）
        const lastVisible = snapshot.docs[docs.length - 1];

        //Prevでの戻り先をhistoryに記憶
        const startVisible = snapshot.docs[0];
        let history = [...this.state.history];
        history.push(startVisible);

        //state更新
        this.setState({
            items: docs,
            lastVisible: lastVisible,
            history: history,
        });

    }

    //次のデータを取得
    getNextData = async () => {

        let nextQuery = null;
        if (this.state.keyword === '') {
            nextQuery = db.collection('members')
                .orderBy('createdAt', 'desc')
                .startAfter(this.state.lastVisible) //記録してある前回の最後以降から取得する
                .limit(this.state.limit);
        } else {
            nextQuery = db.collection('members')
                .where('keywords', 'array-contains-any', [this.state.keyword]) //keywordで検索
                .orderBy('createdAt', 'desc')
                .startAfter(this.state.lastVisible) //記録してある前回の最後以降から取得する
                .limit(this.state.limit);
        }

        const snapshot = await nextQuery.get();

        //データが1つ以上なければ何もしない（最後のページ対策）
        if (snapshot.size < 1) {
            alert("これ以上データが無いようです。");
            return null;
        }

        const docs = snapshot.docs.map(doc => doc.data());

        const lastVisible = snapshot.docs[docs.length - 1];

        //Prevでの戻り先をhistoryに記憶
        const startVisible = snapshot.docs[0];
        let history = [...this.state.history];
        history.push(startVisible);

        this.setState({
            items: docs,
            lastVisible: lastVisible,
            history: history,
        });
    }

    getPrevData = async () => {

        if (this.state.history.length <= 1) {
            return null;
        }

        let prevQuery = null;
        if (this.state.keyword === '') {
            prevQuery = db.collection('members')
                .orderBy('createdAt', 'desc')
                .startAt(this.state.history[this.state.history.length - 2]) //最後から2つ目のページに戻る
                .limit(this.state.limit);
        } else {
            prevQuery = db.collection('members')
                .where('keywords', 'array-contains-any', [this.state.keyword]) //keywordで検索
                .orderBy('createdAt', 'desc')
                .startAt(this.state.history[this.state.history.length - 2]) //最後から2つ目のページに戻る
                .limit(this.state.limit);
        }

        const snapshot = await prevQuery.get();

        if (snapshot.size < 1) {
            return null;
        }

        const docs = snapshot.docs.map(doc => doc.data());

        const lastVisible = snapshot.docs[docs.length - 1];

        //戻る際に最後のhistoryを削除
        const history = [...this.state.history];
        history.pop();

        this.setState({
            items: docs,
            lastVisible: lastVisible,
            history: history,
        });
    }

    //nextがクリックされたとき
    handleNext = () => {
        this.getNextData();
    }

    //prevがクリックされたとき
    handlePrev = () => {
        this.getPrevData();
    }

    //text change対応
    haneleChangeText = (e) => {
        this.setState({ [e.target.name]: e.target.value });
    }

    //search
    handleSearch = () => {
        this.getData();
    }

    //reset
    handleReset = async () => {
        await this.setState({ keyword: '' }); //setが終わらないままgetData()が走るのを防止
        await this.getData();
    }

    //csv download
    getDownloadData = async () => {

        let donwloadQuery = null;
        //keywordの有無で分岐（limit無し）
        if (this.state.keyword === '') {
            donwloadQuery = db.collection("members")
                .orderBy('createdAt', 'desc');
        } else {
            donwloadQuery = db.collection("members")
                .where('keywords', 'array-contains-any', [this.state.keyword])
                .orderBy('createdAt', 'desc');
        }

        const snapshot = await donwloadQuery.get();

        //ダウロード用のデータ生成
        let docs = [];
        snapshot.docs.map(doc => {
            docs.push({
                docId: doc.data().docId,
                name: doc.data().name,
                address: doc.data().address,
                datetime: moment(doc.data().createdAt.seconds * 1000).format('YYYY-MM-DD hh:mm:ss') //フォーマット変換
            });
        })

        //値をセットし、callbackでcsvLinkのClickを実行
        await this.setState({ downloadItems: docs }, () => {
            this.csvLink.current.link.click();
        });
    }

    render() {
        return (
            <div className="container">
                <h3 className="my-4">Pagination sample.</h3>

                <Form inline className="mb-4">
                    <FormGroup className="mb-2 mr-sm-2 mb-sm-0">
                        <Label for="keyword" className="mr-sm-2">Keyword</Label>
                        <Input type="text" name="keyword" id="keyword" value={this.state.keyword} onChange={this.haneleChangeText} ></Input>
                    </FormGroup>
                    <Button onClick={this.handleSearch} color="primary">検索</Button>
                    <Button onClick={this.handleReset} className="ml-sm-2">リセット</Button>
                    <Button onClick={this.getDownloadData} className="ml-sm-5" size="sm" color="info">CSV Download</Button>
                </Form>

                {/* 表示はせず機能だけ利用 */}
                <CSVLink
                    data={this.state.downloadItems}
                    filename="data.csv"
                    ref={this.csvLink}
                    target="_blank"
                />

                <Table striped>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>UID</th>
                            <th>Name</th>
                            <th>Age</th>
                            <th>Address</th>
                            <th>CreatedAt</th>
                        </tr>
                    </thead>
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
                </Table>

                <Pagination>
                    <PaginationItem className={this.state.history.length <= 1 ? 'disabled' : null}>
                        <PaginationLink previous className="mr-3" onClick={this.handlePrev} />
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationLink next onClick={this.handleNext} />
                    </PaginationItem>
                </Pagination>

            </div>
        );
    }
}

export default App;
