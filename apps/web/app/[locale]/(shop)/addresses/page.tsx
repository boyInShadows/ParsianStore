import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AccountNav } from "@/components/account/AccountNav";
import {
  AddressBookContent,
  type AddressBookMessages,
} from "@/components/addresses/AddressBookContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Addresses");
  return {
    title: t("title"),
    // A shopper's own saved addresses are private, per-session data --
    // not indexable, same reasoning as /cart, /checkout, /orders.
    robots: { index: false, follow: false },
  };
}

export default async function AddressesPage() {
  const t = await getTranslations("Addresses");
  const tOrders = await getTranslations("Orders");
  const tWishlist = await getTranslations("Wishlist");
  const messages: AddressBookMessages = {
    title: t("title"),
    loading: t("loading"),
    emptyTitle: t("emptyTitle"),
    emptyDescription: t("emptyDescription"),
    addNew: t("addNew"),
    editAria: t("editAria"),
    deleteAria: t("deleteAria"),
    deleteError: t("deleteError"),
    cancel: t("form.cancel"),
    provinceLabel: t("form.provinceLabel"),
    cityLabel: t("form.cityLabel"),
    selectPlaceholder: t("form.selectPlaceholder"),
    lineLabel: t("form.lineLabel"),
    postalCodeLabel: t("form.postalCodeLabel"),
    plateLabel: t("form.plateLabel"),
    unitLabel: t("form.unitLabel"),
    receiverNameLabel: t("form.receiverNameLabel"),
    receiverPhoneLabel: t("form.receiverPhoneLabel"),
    saveButton: t("form.saveButton"),
    savingButton: t("form.savingButton"),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <AccountNav
        active="addresses"
        ordersLabel={tOrders("title")}
        addressesLabel={t("title")}
        wishlistLabel={tWishlist("title")}
      />
      <div className="mt-6">
        <AddressBookContent messages={messages} />
      </div>
    </main>
  );
}
