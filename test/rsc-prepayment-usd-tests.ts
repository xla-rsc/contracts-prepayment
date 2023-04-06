import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import {deployRSCPrepayment} from "./rsc-prepayment-tests";
const { constants } = require('@openzeppelin/test-helpers');


async function deployRSCPrepaymentUsd(
    controller: any,
    distributors: any,
    immutableController: any,
    autoNativeTokenDistribution: any,
    minAutoDistributeAmount: any,
    investor: any,
    investedAmount: any,
    interestRate: any,
    residualInterestRate: any,
    initialRecipients: any,
    percentages: any,
    supportedErc20addresses: any,
    creationId: any,
) {
    const RSCPrepaymentUsdFactory = await ethers.getContractFactory("XLARSCPrepaymentFactory");
    const rscPrepaymentUsdFactory = await RSCPrepaymentUsdFactory.deploy();
    await rscPrepaymentUsdFactory.deployed();

    const UsdPriceFeedMock = await ethers.getContractFactory("UsdPriceFeedMock");
    const usdPriceFeedMock = await UsdPriceFeedMock.deploy();
    await usdPriceFeedMock.deployed();

    const tx = await rscPrepaymentUsdFactory.createRSCPrepaymentUsd(
        {
          controller: controller,
          distributors: distributors,
          immutableController: immutableController,
          autoNativeTokenDistribution: autoNativeTokenDistribution,
          minAutoDistributeAmount: minAutoDistributeAmount,
          investor: investor,
          investedAmount: investedAmount,
          interestRate: interestRate,
          residualInterestRate: residualInterestRate,
          nativeTokenUsdPriceFeed: usdPriceFeedMock.address,
          initialRecipients: initialRecipients,
          percentages: percentages,
          supportedErc20addresses: supportedErc20addresses,
          erc20PriceFeeds: [usdPriceFeedMock.address, ],
          creationId: creationId,
        }
    );
    let receipt = await tx.wait();
    const rscPrepaymentUsdContractAddress = receipt.events?.[4].args?.[0];

    const RSCPrepaymentUsdContract = await ethers.getContractFactory("XLARSCPrepaymentUsd");
    const rscPrepaymentUsdContract = await RSCPrepaymentUsdContract.attach(rscPrepaymentUsdContractAddress);
    return rscPrepaymentUsdContract;
}


describe("XLA RSC Prepayment USD tests", function () {
  let rscPrepaymentUsdContract: any;
  let TestToken: any;
  let testToken: any;

  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;
  let addr4: any;
  let investor: any;
  let addrs: any;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, addr4, investor, ...addrs] = await ethers.getSigners();
    TestToken = await ethers.getContractFactory("TestToken");
    testToken = await TestToken.deploy("TestToken", "TTT", 10000000000);
    await testToken.deployed();

    rscPrepaymentUsdContract = await deployRSCPrepaymentUsd(
        owner.address,
        [owner.address, ],
        false,
        true,
        ethers.utils.parseEther("1"),
        investor.address,
        ethers.utils.parseEther("100000"),
        BigInt(3000000),
        BigInt(500000),
        [addr1.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );
  });

  it("Should set base attrs correctly", async () => {
    expect(await rscPrepaymentUsdContract.owner()).to.be.equal(owner.address);
    expect(await rscPrepaymentUsdContract.distributors(owner.address)).to.be.true;
    expect(await rscPrepaymentUsdContract.investor()).to.be.equal(investor.address);
    expect(await rscPrepaymentUsdContract.investedAmount()).to.be.equal(ethers.utils.parseEther("100000"));
    expect(await rscPrepaymentUsdContract.investorAmountToReceive()).to.be.equal(ethers.utils.parseEther("130000"));
    expect(await rscPrepaymentUsdContract.controller()).to.be.equal(owner.address);
    expect(await rscPrepaymentUsdContract.platformFee()).to.be.equal(0);
  });


  it("Should set recipients correctly", async() => {
    await expect(
        rscPrepaymentUsdContract.connect(addr3).setRecipients(
          [addr1.address, addr3.address, addr4.address],
          [2000000, 5000000, 3000000],
        )
    ).to.be.revertedWithCustomError(rscPrepaymentUsdContract, "OnlyControllerError");

    await rscPrepaymentUsdContract.setRecipients(
        [addr1.address, addr3.address, addr4.address],
        [2000000, 5000000, 3000000],
    );

    expect(await rscPrepaymentUsdContract.recipients(0)).to.be.equal(addr1.address);
    expect(await rscPrepaymentUsdContract.recipients(1)).to.be.equal(addr3.address);
    expect(await rscPrepaymentUsdContract.recipients(2)).to.be.equal(addr4.address);
    expect(await rscPrepaymentUsdContract.recipientsPercentage(addr1.address)).to.be.equal(2000000);
    expect(await rscPrepaymentUsdContract.recipientsPercentage(addr3.address)).to.be.equal(5000000);
    expect(await rscPrepaymentUsdContract.recipientsPercentage(addr4.address)).to.be.equal(3000000);
    expect(await rscPrepaymentUsdContract.numberOfRecipients()).to.be.equal(3);

    await expect(
        rscPrepaymentUsdContract.setRecipients(
          [addr1.address, addr3.address, addr4.address],
          [2000000, 5000000, 2000000],
        )
    ).to.be.revertedWithCustomError(rscPrepaymentUsdContract, "InvalidPercentageError");

    await rscPrepaymentUsdContract.setRecipients(
        [investor.address, addr4.address, addr3.address, addr1.address],
        [2000000, 2000000, 3000000, 3000000],
    );

    expect(await rscPrepaymentUsdContract.recipients(0)).to.be.equal(investor.address);
    expect(await rscPrepaymentUsdContract.recipients(1)).to.be.equal(addr4.address);
    expect(await rscPrepaymentUsdContract.recipients(2)).to.be.equal(addr3.address);
    expect(await rscPrepaymentUsdContract.recipients(3)).to.be.equal(addr1.address);
    expect(await rscPrepaymentUsdContract.recipientsPercentage(investor.address)).to.be.equal(2000000);
    expect(await rscPrepaymentUsdContract.recipientsPercentage(addr4.address)).to.be.equal(2000000);
    expect(await rscPrepaymentUsdContract.recipientsPercentage(addr3.address)).to.be.equal(3000000);
    expect(await rscPrepaymentUsdContract.recipientsPercentage(addr1.address)).to.be.equal(3000000);
    expect(await rscPrepaymentUsdContract.numberOfRecipients()).to.be.equal(4);
  });

  it("Should redistribute eth correctly", async() => {
    await rscPrepaymentUsdContract.setRecipients(
        [addr1.address, addr2.address, ],
        [8000000, 2000000, ],
    );

    expect(await rscPrepaymentUsdContract.numberOfRecipients()).to.be.equal(2);

    let addr1BalanceBefore = (await ethers.provider.getBalance(addr1.address)).toBigInt();
    let addr2BalanceBefore = (await ethers.provider.getBalance(addr2.address)).toBigInt();
    let investorBalanceBefore = (await ethers.provider.getBalance(investor.address)).toBigInt();

    let transactionHash = await owner.sendTransaction({
      to: rscPrepaymentUsdContract.address,
      value: ethers.utils.parseEther("50"),
    });

    let addr1BalanceAfter = (await ethers.provider.getBalance(addr1.address)).toBigInt();
    let addr2BalanceAfter = (await ethers.provider.getBalance(addr2.address)).toBigInt();
    let investorBalanceAfter = (await ethers.provider.getBalance(investor.address)).toBigInt();

    expect(addr1BalanceAfter).to.be.equal(addr1BalanceBefore);
    expect(addr2BalanceAfter).to.be.equal(addr2BalanceBefore);
    expect(investorBalanceAfter).to.be.equal(
        investorBalanceBefore + ethers.utils.parseEther("50").toBigInt()
    )
    let transactionHash2 = await owner.sendTransaction({
      to: rscPrepaymentUsdContract.address,
      value: ethers.utils.parseEther("50"),
    });

    let addr1BalanceAfter2 = (await ethers.provider.getBalance(addr1.address)).toBigInt();
    let addr2BalanceAfter2 = (await ethers.provider.getBalance(addr2.address)).toBigInt();
    let investorBalanceAfter2 = (await ethers.provider.getBalance(investor.address)).toBigInt();

    expect(addr1BalanceAfter2).to.be.equal(addr1BalanceAfter);
    expect(addr2BalanceAfter2).to.be.equal(addr2BalanceAfter);
    expect(investorBalanceAfter2).to.be.equal(
        investorBalanceAfter + ethers.utils.parseEther("50").toBigInt()
    )

    let transactionHash3 = await owner.sendTransaction({
      to: rscPrepaymentUsdContract.address,
      value: ethers.utils.parseEther("50"),
    });

    let addr1BalanceAfter3 = (await ethers.provider.getBalance(addr1.address)).toBigInt();
    let addr2BalanceAfter3 = (await ethers.provider.getBalance(addr2.address)).toBigInt();
    let investorBalanceAfter3 = (await ethers.provider.getBalance(investor.address)).toBigInt();

    expect(addr1BalanceAfter3).to.be.equal(addr1BalanceAfter2 + ethers.utils.parseEther("15.2").toBigInt());
    expect(addr2BalanceAfter3).to.be.equal(addr2BalanceAfter2 + ethers.utils.parseEther("3.8").toBigInt());
    expect(investorBalanceAfter3).to.be.equal(
        investorBalanceAfter2 + ethers.utils.parseEther("31").toBigInt()
    )

    let transactionHash4 = await owner.sendTransaction({
      to: rscPrepaymentUsdContract.address,
      value: ethers.utils.parseEther("50"),
    });

    let addr1BalanceAfter4 = (await ethers.provider.getBalance(addr1.address)).toBigInt();
    let addr2BalanceAfter4 = (await ethers.provider.getBalance(addr2.address)).toBigInt();
    let investorBalanceAfter4 = (await ethers.provider.getBalance(investor.address)).toBigInt();

    expect(addr1BalanceAfter4).to.be.equal(addr1BalanceAfter3 + ethers.utils.parseEther("38").toBigInt());
    expect(addr2BalanceAfter4).to.be.equal(addr2BalanceAfter3 + ethers.utils.parseEther("9.5").toBigInt());
    expect(investorBalanceAfter4).to.be.equal(
        investorBalanceAfter3 + ethers.utils.parseEther("2.5").toBigInt()
    )

  });

  it("Should redistribute ERC20 token", async() => {
    await testToken.transfer(rscPrepaymentUsdContract.address, ethers.utils.parseEther("130"))

    await rscPrepaymentUsdContract.setRecipients(
        [addr1.address, addr2.address, ],
        [2000000, 8000000, ],
    );

    await rscPrepaymentUsdContract.redistributeToken(testToken.address)
    expect(await testToken.balanceOf(rscPrepaymentUsdContract.address)).to.be.equal(0);
    expect(await testToken.balanceOf(addr1.address)).to.be.equal(ethers.utils.parseEther("0"));
    expect(await testToken.balanceOf(addr2.address)).to.be.equal(ethers.utils.parseEther("0"));
    expect(await testToken.balanceOf(investor.address)).to.be.equal(ethers.utils.parseEther("130"));


    await testToken.transfer(rscPrepaymentUsdContract.address, ethers.utils.parseEther("100"))

    await expect(
        rscPrepaymentUsdContract.connect(addr3).redistributeToken(testToken.address)
    ).to.be.revertedWithCustomError(rscPrepaymentUsdContract, "OnlyDistributorError");

    await expect(
        rscPrepaymentUsdContract.connect(addr3).setDistributor(addr3.address, true)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await rscPrepaymentUsdContract.setDistributor(addr3.address, true)
    await rscPrepaymentUsdContract.connect(addr3).redistributeToken(testToken.address)

    expect(await testToken.balanceOf(rscPrepaymentUsdContract.address)).to.be.equal(0);
    expect(await testToken.balanceOf(addr1.address)).to.be.equal(ethers.utils.parseEther("19"));
    expect(await testToken.balanceOf(addr2.address)).to.be.equal(ethers.utils.parseEther("76"));
    expect(await testToken.balanceOf(investor.address)).to.be.equal(ethers.utils.parseEther("135"));

    await rscPrepaymentUsdContract.setTokenUsdPriceFeed(testToken.address, constants.ZERO_ADDRESS);
    await testToken.transfer(rscPrepaymentUsdContract.address, ethers.utils.parseEther("100"))
    await expect(
        rscPrepaymentUsdContract.connect(addr3).redistributeToken(testToken.address)
    ).to.be.revertedWithCustomError(rscPrepaymentUsdContract, "TokenMissingUsdPriceOracle")
  });

  it("Should initialize only once", async() => {
    await expect(
        rscPrepaymentUsdContract.initialize(
            {
              owner: addr2.address,
              controller: addr2.address,
              _distributors: [addr2.address, ],
              immutableController: true,
              autoNativeTokenDistribution: false,
              minAutoDistributionAmount: ethers.utils.parseEther("1"),
              platformFee: BigInt(0),
              factoryAddress: addr1.address,
              supportedErc20addresses: [],
              erc20PriceFeeds: []
            },
            addr1.address,
            ethers.utils.parseEther("100"),
            BigInt(10),
            BigInt(5),
            addr3.address,
            [addr1.address, ],
            [10000000, ],
        )
    ).to.be.revertedWith(
        "Initializable: contract is already initialized"
    )
  });

  it("Should transfer ownership correctly", async() => {
    await rscPrepaymentUsdContract.transferOwnership(addr1.address);
    expect(await rscPrepaymentUsdContract.owner()).to.be.equal(addr1.address);
  });

  it("Should deploy and create immutable contract", async() => {
    const rscUsdPrepaymentImmutableContract = await deployRSCPrepaymentUsd(
        constants.ZERO_ADDRESS,
        [owner.address, ],
        true,
        true,
        ethers.utils.parseEther("1"),
        investor.address,
        ethers.utils.parseEther("100"),
        BigInt(3000000),
        BigInt(500000),
        [addr1.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );

    await expect(rscUsdPrepaymentImmutableContract.setRecipients(
        [addr1.address, addr2.address, ],
        [2000000, 8000000, ],
    )).to.be.revertedWithCustomError(rscUsdPrepaymentImmutableContract, "OnlyControllerError");

    await expect(rscUsdPrepaymentImmutableContract.connect(addr2).setController(addr2.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
    );
    await expect(
        rscUsdPrepaymentImmutableContract.setController(addr1.address)
    ).to.be.revertedWithCustomError(rscUsdPrepaymentImmutableContract, "ImmutableControllerError");
  });

  it("Should create manual distribution split", async() => {
    const rscUsdPrepaymentManualDistribution = await deployRSCPrepaymentUsd(
        constants.ZERO_ADDRESS,
        [owner.address, ],
        false,
        false,
        ethers.utils.parseEther("1"),
        investor.address,
        ethers.utils.parseEther("100000"),
        BigInt(3000000),
        BigInt(500000),
        [addr1.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );

    const transactionHash = await owner.sendTransaction({
      to: rscUsdPrepaymentManualDistribution.address,
      value: ethers.utils.parseEther("50"),
    });

    const contractBalance = (await ethers.provider.getBalance(rscUsdPrepaymentManualDistribution.address)).toBigInt();
    expect(contractBalance).to.be.equal(ethers.utils.parseEther("50"));

    await expect(
        rscUsdPrepaymentManualDistribution.connect(addr3).redistributeNativeToken()
    ).to.be.revertedWithCustomError(rscUsdPrepaymentManualDistribution, "OnlyDistributorError");

    const investorBalanceBefore = (await ethers.provider.getBalance(investor.address)).toBigInt();
    await rscUsdPrepaymentManualDistribution.redistributeNativeToken()

    const contractBalance2 = (await ethers.provider.getBalance(rscUsdPrepaymentManualDistribution.address)).toBigInt();
    expect(contractBalance2).to.be.equal(0);

    const investorBalanceAfter = (await ethers.provider.getBalance(investor.address)).toBigInt();
    expect(investorBalanceAfter).to.be.equal(investorBalanceBefore + ethers.utils.parseEther("50").toBigInt());
  });

  it("Should work with fees Correctly", async() => {
    const RSCPrepaymentFeeFactory = await ethers.getContractFactory("XLARSCPrepaymentFactory");
    const rscPrepaymentFeeFactory = await RSCPrepaymentFeeFactory.deploy();
    await rscPrepaymentFeeFactory.deployed();

    const UsdPriceFeedMock = await ethers.getContractFactory("UsdPriceFeedMock");
    const usdPriceFeedMock = await UsdPriceFeedMock.deploy();
    await usdPriceFeedMock.deployed();

    await expect(
        rscPrepaymentFeeFactory.connect(addr1).setPlatformFee(BigInt(1))
    ).to.be.revertedWith(
        "Ownable: caller is not the owner"
    )

    await expect(
        rscPrepaymentFeeFactory.setPlatformFee(BigInt(10000001))
    ).to.be.revertedWithCustomError(rscPrepaymentFeeFactory, "InvalidFeePercentage");

    await expect(
        rscPrepaymentFeeFactory.connect(addr1).setPlatformWallet(addr2.address)
    ).to.be.revertedWith(
        "Ownable: caller is not the owner"
    )

    await rscPrepaymentFeeFactory.setPlatformFee(BigInt(5000000));
    await rscPrepaymentFeeFactory.setPlatformWallet(addr4.address);

    expect(await rscPrepaymentFeeFactory.platformWallet()).to.be.equal(addr4.address);
    expect(await rscPrepaymentFeeFactory.platformFee()).to.be.equal(BigInt(5000000));

    const txFee = await rscPrepaymentFeeFactory.createRSCPrepaymentUsd(
        {
          controller: owner.address,
          distributors: [owner.address, ],
          immutableController: false,
          autoNativeTokenDistribution: true,
          minAutoDistributeAmount: ethers.utils.parseEther("1"),
          investor: investor.address,
          investedAmount: ethers.utils.parseEther("100000"),
          interestRate: BigInt("3000"),
          residualInterestRate: BigInt("500"),
          nativeTokenUsdPriceFeed: usdPriceFeedMock.address,
          initialRecipients: [addr1.address, ],
          percentages: [10000000, ],
          supportedErc20addresses: [testToken.address, ],
          erc20PriceFeeds: [usdPriceFeedMock.address, ],
          creationId: constants.ZERO_BYTES32,
        }
    );

    let receipt = await txFee.wait();
    const revenueShareContractAddress = receipt.events?.[4].args?.[0];
    const XLARevenueShareContract = await ethers.getContractFactory("XLARSCPrepaymentUsd");
    const xlaRSCFeePrepaymentUsd = await XLARevenueShareContract.attach(revenueShareContractAddress);

    const platformWalletBalanceBefore = (await ethers.provider.getBalance(addr4.address)).toBigInt()
    const investorBalanceBefore = (await ethers.provider.getBalance(investor.address)).toBigInt()

    const transactionHash = await owner.sendTransaction({
      to: xlaRSCFeePrepaymentUsd.address,
      value: ethers.utils.parseEther("50"),
    });

    const platformWalletBalanceAfter = (await ethers.provider.getBalance(addr4.address)).toBigInt()
    const investorBalanceAfter = (await ethers.provider.getBalance(investor.address)).toBigInt()

    expect(platformWalletBalanceAfter).to.be.equal(
        platformWalletBalanceBefore + ethers.utils.parseEther("25").toBigInt()
    );
    expect(investorBalanceAfter).to.be.equal(
        investorBalanceBefore + ethers.utils.parseEther("25").toBigInt()
    );

    await testToken.transfer(xlaRSCFeePrepaymentUsd.address, ethers.utils.parseEther("100"))
    await xlaRSCFeePrepaymentUsd.redistributeToken(testToken.address)
    expect(await testToken.balanceOf(addr4.address)).to.be.equal(ethers.utils.parseEther("50"))
    expect(await testToken.balanceOf(investor.address)).to.be.equal(ethers.utils.parseEther("50"))
    expect(await testToken.balanceOf(xlaRSCFeePrepaymentUsd.address)).to.be.equal(0)
  });

  it("Should set ETH price feed oracle correctly", async() => {
    const UsdPriceFeedMock = await ethers.getContractFactory("UsdPriceFeedMock");
    const usdPriceFeedMock = await UsdPriceFeedMock.deploy();
    await usdPriceFeedMock.deployed();

    await expect(rscPrepaymentUsdContract.connect(addr2).setNativeTokenPriceFeed(usdPriceFeedMock.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
    );

    await rscPrepaymentUsdContract.setNativeTokenPriceFeed(usdPriceFeedMock.address);
  });

  it("Should work with creation ID correctly", async() => {
    const XLARSCPrepaymentCreationIdFactory = await ethers.getContractFactory("XLARSCPrepaymentFactory");
    const xlaRSCPrepaymentCreationIdFactory = await XLARSCPrepaymentCreationIdFactory.deploy();
    await xlaRSCPrepaymentCreationIdFactory.deployed();

    const UsdPriceFeedMock = await ethers.getContractFactory("UsdPriceFeedMock");
    const usdPriceFeedMock = await UsdPriceFeedMock.deploy();
    await usdPriceFeedMock.deployed();

    await xlaRSCPrepaymentCreationIdFactory.createRSCPrepaymentUsd(
        {
          controller: owner.address,
          distributors: [owner.address, ],
          immutableController: false,
          autoNativeTokenDistribution: true,
          minAutoDistributeAmount: ethers.utils.parseEther("1"),
          investor: investor.address,
          investedAmount: ethers.utils.parseEther("100000"),
          interestRate: BigInt("3000"),
          residualInterestRate: BigInt("500"),
          nativeTokenUsdPriceFeed: usdPriceFeedMock.address,
          initialRecipients: [addr1.address, ],
          percentages: [10000000, ],
          supportedErc20addresses: [testToken.address, ],
          erc20PriceFeeds: [usdPriceFeedMock.address, ],
          creationId: ethers.utils.formatBytes32String("test-creation-id-1")
        }
    );

    await expect(xlaRSCPrepaymentCreationIdFactory.createRSCPrepaymentUsd(
        {
          controller: owner.address,
          distributors: [owner.address, ],
          immutableController: false,
          autoNativeTokenDistribution: true,
          minAutoDistributeAmount: ethers.utils.parseEther("1"),
          investor: investor.address,
          investedAmount: ethers.utils.parseEther("100000"),
          interestRate: BigInt("3000"),
          residualInterestRate: BigInt("500"),
          nativeTokenUsdPriceFeed: usdPriceFeedMock.address,
          initialRecipients: [addr1.address, ],
          percentages: [10000000, ],
          supportedErc20addresses: [testToken.address, ],
          erc20PriceFeeds: [usdPriceFeedMock.address, ],
          creationId: ethers.utils.formatBytes32String("test-creation-id-1")
        }
    )).to.be.revertedWithCustomError(xlaRSCPrepaymentCreationIdFactory, "CreationIdAlreadyProcessed");

    await xlaRSCPrepaymentCreationIdFactory.createRSCPrepaymentUsd(
        {
          controller: owner.address,
          distributors: [owner.address, ],
          immutableController: false,
          autoNativeTokenDistribution: true,
          minAutoDistributeAmount: ethers.utils.parseEther("1"),
          investor: investor.address,
          investedAmount: ethers.utils.parseEther("100000"),
          interestRate: BigInt("3000"),
          residualInterestRate: BigInt("500"),
          nativeTokenUsdPriceFeed: usdPriceFeedMock.address,
          initialRecipients: [addr1.address, ],
          percentages: [10000000, ],
          supportedErc20addresses: [testToken.address, ],
          erc20PriceFeeds: [usdPriceFeedMock.address, ],
          creationId: ethers.utils.formatBytes32String("test-creation-id-2")
        }
    );
  });

  it("Should recursively erc20 split recipient", async() => {
    const rscPrepaymentUsdMain = await deployRSCPrepaymentUsd(
        constants.ZERO_ADDRESS,
        [owner.address, ],
        false,
        false,
        ethers.utils.parseEther("1"),
        investor.address,
        ethers.utils.parseEther("10000"),
        BigInt(3000),
        BigInt(500),
        [rscPrepaymentUsdContract.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );

    await testToken.transfer(rscPrepaymentUsdContract.address, ethers.utils.parseEther("1000000"));
    await testToken.transfer(rscPrepaymentUsdMain.address, ethers.utils.parseEther("1000000"));

    await rscPrepaymentUsdContract.setDistributor(rscPrepaymentUsdMain.address, true);
    await rscPrepaymentUsdMain.redistributeToken(testToken.address);

    expect(await testToken.balanceOf(rscPrepaymentUsdMain.address)).to.be.equal(0);
    expect(await testToken.balanceOf(rscPrepaymentUsdContract.address)).to.be.equal(0);
  });

  it("Should recursively erc20 split investor", async() => {
    const rscPrepaymentMain = await deployRSCPrepaymentUsd(
        constants.ZERO_ADDRESS,
        [owner.address, ],
        false,
        false,
        ethers.utils.parseEther("1"),
        rscPrepaymentUsdContract.address,
        ethers.utils.parseEther("10000"),
        BigInt(3000000),
        BigInt(500000),
        [addr1.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );

    await testToken.transfer(rscPrepaymentUsdContract.address, ethers.utils.parseEther("1000000"));
    await testToken.transfer(rscPrepaymentMain.address, ethers.utils.parseEther("1000000"));

    await rscPrepaymentUsdContract.setDistributor(rscPrepaymentMain.address, true);
    await rscPrepaymentMain.redistributeToken(testToken.address);

    expect(await testToken.balanceOf(rscPrepaymentMain.address)).to.be.equal(0);
    expect(await testToken.balanceOf(rscPrepaymentUsdContract.address)).to.be.equal(0);
  });

  it("Should recursively split ETH", async() => {
      const rscPrepaymentUsdSecond = await deployRSCPrepaymentUsd(
        constants.ZERO_ADDRESS,
        [owner.address, ],
        false,
        false,
        ethers.utils.parseEther("1"),
        investor.address,
        ethers.utils.parseEther("10000"),
        BigInt(3000000),
        BigInt(500000),
        [addr1.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );

    const rscPrepaymentUsdMain = await deployRSCPrepaymentUsd(
        constants.ZERO_ADDRESS,
        [owner.address, ],
        false,
        false,
        ethers.utils.parseEther("1"),
        investor.address,
        ethers.utils.parseEther("10000"),
        BigInt(3000000),
        BigInt(500000),
        [rscPrepaymentUsdSecond.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );

    await owner.sendTransaction({
      to: rscPrepaymentUsdMain.address,
      value: ethers.utils.parseEther("50"),
    });

    expect(
        await ethers.provider.getBalance(rscPrepaymentUsdMain.address)
    ).to.be.equal(ethers.utils.parseEther("50"));

    await rscPrepaymentUsdSecond.setDistributor(rscPrepaymentUsdMain.address, true);
    await rscPrepaymentUsdMain.redistributeNativeToken();

    expect(await ethers.provider.getBalance(rscPrepaymentUsdMain.address)).to.be.equal(0);
    expect(await ethers.provider.getBalance(rscPrepaymentUsdSecond.address)).to.be.equal(0);
  });

});
