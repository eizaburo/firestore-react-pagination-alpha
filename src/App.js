import React from 'react';
import './App.css';
import { db } from './Firebase';
import moment from 'moment';
import { CSVLink, CSVDownload } from 'react-csv';
import { hidden } from 'ansi-colors';

import { Table, Form, FormGroup, Label, Input, Button, Pagination, PaginationItem, PaginationLink } from 'reactstrap';
import { timingSafeEqual } from 'crypto';

class App extends React.Component {

    state = {
        items: [], //検索結果
        downloadItems: [],
        limit: 10, //ページ行数
        lastVisible: null, //マイページの最後の行（object）
        history: [], //ページ遷移履歴
        keyword: '', //検索キーワード
    }

    csvLink = React.createRef();

    componentDidMount = async () => {
        //初期データ取得
        await this.getData();
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
            this.setState({ pageEnd: true });
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

    handleCSV = async () => {
        const csvData = this.state.items;
    }

    getDownloadData = async () => {

        let donwloadQuery = null;
        if (this.state.keyword === '') {
            donwloadQuery = db.collection("members")
                .orderBy('createdAt', 'desc');
        } else {
            donwloadQuery = db.collection("members")
                .where('keywords', 'array-contains-any', [this.state.keyword])
                .orderBy('createdAt', 'desc');
        }

        const snapshot = await donwloadQuery.get();
        let docs = [];
        snapshot.docs.map(doc => {
            docs.push({
                docId: doc.data().docId,
                name: doc.data().name,
                address: doc.data().address,
                datetime: moment(doc.data().createdAt.seconds * 1000).format('YYYY-MM-DD hh:mm:ss')
            });
        })

        await this.setState({ downloadItems: docs }, () => {
            this.csvLink.current.link.click();
        });
    }

    render() {
        // console.log(this.state);
        return (
            <div className="container">
                <h3 className="my-4">Pagination sample.</h3>
                <Form inline className="mb-4">
                    <FormGroup className="mb-2 mr-sm-2 mb-sm-0">
                        <Label for="keyword" className="mr-sm-2">Keyword</Label>
                        <Input type="text" name="keyword" id="keyword" value={this.state.keyword} onChange={this.changeText} ></Input>
                    </FormGroup>
                    <Button onClick={this.handleSearch} color="primary">検索</Button>
                    <Button onClick={this.handleReset} className="ml-sm-2">リセット</Button>
                    <Button onClick={this.getDownloadData} className="ml-sm-5" size="sm" color="info">CSV Download</Button>
                </Form>
                
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
                    <PaginationItem className={[
                        'mr-3',
                        this.state.history.length <= 1 ? 'disabled' : null
                    ].join(' ')}>
                        <PaginationLink onClick={() => this.handlePrev()} previous />
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationLink onClick={() => this.handleNext()} next />
                    </PaginationItem>
                </Pagination>

            </div>
        );
    }
}

export default App;
