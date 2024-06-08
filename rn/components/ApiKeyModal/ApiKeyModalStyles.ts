import { StyleSheet } from 'react-native';
import { COLORS } from "./../../../constants/colors";

export const s = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  contentContainer: {
    height: '75%',
    backgroundColor: COLORS.gallery,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: -12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 11
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    // alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20
  },
  boldText: {
    fontSize: 24,
    fontWeight: "700"
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 12
  },
  actionText: {
    color: COLORS.flamingo,
  },
  mainContent: {
    width: '100%',
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: 'space-between'
  },
  textinput: {
    width: '100%',
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12
  },
  bottomBtn: {
    width: '100%',
    height: 56,
    marginBottom: 24
  },
  errorText: {
    color: COLORS.red
  }
});