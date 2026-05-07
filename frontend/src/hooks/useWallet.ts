/**
 * useWallet - MetaMask / Ethers.js integration hook.
 */
import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";

interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  isConnecting: boolean;
  isConnected: boolean;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    balance: null,
    provider: null,
    signer: null,
    isConnecting: false,
    isConnected: false,
  });

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not installed");
      return;
    }

    setState((s) => ({ ...s, isConnecting: true }));
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const raw = await provider.getBalance(address);
      const balance = ethers.formatEther(raw);

      setState({
        address,
        chainId: Number(network.chainId),
        balance: parseFloat(balance).toFixed(4),
        provider,
        signer,
        isConnecting: false,
        isConnected: true,
      });
      toast.success(`Connected: ${address.slice(0, 6)}…${address.slice(-4)}`);
    } catch (err: any) {
      toast.error(err.message || "Connection failed");
      setState((s) => ({ ...s, isConnecting: false }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null, chainId: null, balance: null,
      provider: null, signer: null, isConnecting: false, isConnected: false,
    });
    toast("Wallet disconnected");
  }, []);

  // Auto-reconnect on page load
  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum.request<string[]>({ method: "eth_accounts" }).then((accounts) => {
      if (accounts.length > 0) connect();
    });

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnect();
      else connect();
    };
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [connect, disconnect]);

  return { ...state, connect, disconnect };
}
