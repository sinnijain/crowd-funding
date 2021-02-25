const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3')

const web3 = new Web3(ganache.provider());

const compiledFactory = require('../etherium/build/CampaignFactory.json');
const compiledCampaign = require('../etherium/build/Campaign.json');

let accounts;
let factory;
let campaignAddress;
let campaign;

beforeEach( async () => {
    accounts = await web3.eth.getAccounts();

    factory = await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
                .deploy({ data: compiledFactory.bytecode })
                .send({ from: accounts[0] , gas: '1000000' })

    await factory.methods.createCampaign('100').send({
        from: accounts[0],
        gas: '1000000'
    });

    [ campaignAddress ] = await factory.methods.getDeployedCampaigns().call()

    campaign = await new web3.eth.Contract(JSON.parse(compiledCampaign.interface) , campaignAddress)

})

describe( 'Campaign' , () => {
    it('deploy a factory and campaign ' , () => {
        assert.ok(factory.options.address);
        assert.ok(campaign.options.address);
    })

    it('marks caller a manager of campaign' , async () => {
        const manager = await campaign.methods.manager().call();
        assert.equal(manager , accounts[0])
    })

    it('allows people to contribute money and marks them as approvers' , async () => {
        await campaign.methods.contribute().send({
            value: '200',
            from: accounts[1]
        })

        const isApprover = await campaign.methods.approvers(accounts[1]).call();

        assert(isApprover)
    })

    it('requires a minimum amount to contribute', async () => {
        try {
            await campaign.methods.contribute().send({
                value: '0',
                from: accounts[1]
            })
            assert(false)
        }
        catch(err) {
            assert(err)
        }
    })

    it('allows a manager to make a payment request' , async () => {
        await campaign.methods.createRequest( "buy chargers" , '100' , accounts[2]).send({from: accounts[0] , gas: '1000000'})

        const request = await campaign.methods.requests(0).call();

        assert.equal(request.description , "buy chargers" )

    })

    it('create a request and finalize request' , async () => {
        await campaign.methods.contribute().send({
            from: accounts[0],
            value: web3.utils.toWei('10' , 'ether')
        })

        await campaign.methods
            .createRequest( "buy chargers" , web3.utils.toWei('5' , 'ether') , accounts[5])
            .send({from: accounts[0] , gas: '1000000'})

        await campaign.methods.approveRequest(0).send({
            from: accounts[0],
            gas: '1000000'
        })

        await campaign.methods.finalizeRequest(0).send({
            from: accounts[0],
            gas: '1000000'
        })

        let balance = await web3.eth.getBalance(accounts[5]); //money in wei and in string
        balance = web3.utils.fromWei(balance , 'ether');
        balance = parseFloat(balance)
        
        assert( balance > 104);
    })

})